using EasyNote.DTOs;
using EasyNote.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Security.Claims;
using Google.Apis.Auth;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;
using static System.Net.Mime.MediaTypeNames;
using HtmlAgilityPack;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Reflection.Metadata;
using System.Threading.Tasks.Dataflow;
using System.IO;
using DinkToPdf;
using Microsoft.AspNetCore.Http.Extensions;
using System.Text.RegularExpressions;
using DinkToPdf.Contracts;

namespace EasyNote.Controllers
{
    public enum RegistType
    {
        EasyNote,
        Google,
    }

    public class MainController : Controller
    {
        private readonly EasyNoteContext _easyNoteContext;
        private IWebHostEnvironment _webHostEnvironment;
        private IConfiguration _config;
        private readonly IConverter _converter;

        public MainController(EasyNoteContext easyNoteContext, IWebHostEnvironment webHostEnvironment, IConfiguration config, IConverter converter)
        {
            _easyNoteContext = easyNoteContext;
            _webHostEnvironment = webHostEnvironment;
            _config = config;
            _converter = converter;
        }

        public IActionResult Index()
        {
            if (User.Identity != null && User.Identity.IsAuthenticated)
                return Redirect("/Workspace");
            return View("index", _config.GetValue<string>("GoogleApiClientId"));
        }

        [HttpPost]
        public IActionResult Login(LoginDTO loginDTO)
        {
            if (User.Identity.IsAuthenticated)
                return Redirect("/");

            User? user = (from a in _easyNoteContext.Users
                          where a.Account == loginDTO.Account
                          && a.Password == loginDTO.Password
                          select a).SingleOrDefault();

            if (user == null)
            {
                TempData["error"] = "Wrong Account or Password!";
                return Redirect("/");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Sid, user.Id),
                new Claim(ClaimTypes.Email, user.Account),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, "User")
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(claimsIdentity));
            return Redirect("/Workspace");
        }

        public async Task<IActionResult> GoogleLoginAsync()
        {
            if (User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                string? formCredential = Request.Form["credential"]; //回傳憑證
                string? formToken = Request.Form["g_csrf_token"]; //回傳令牌
                string? cookiesToken = Request.Cookies["g_csrf_token"]; //Cookie 令牌

                // 驗證 Google Token
                GoogleJsonWebSignature.Payload? payload = VerifyGoogleToken(formCredential, formToken, cookiesToken).Result;
                if (payload == null)
                {
                    // 驗證失敗
                    TempData["error"] = "unexpected error!";
                    return Redirect("/Index");
                }
                else
                {
                    //驗證成功，取使用者資訊內容
                    User? user = (from a in _easyNoteContext.Users
                                  where a.Account == payload.Email
                                  && a.RegistType == Enum.GetName(RegistType.Google)
                                  select a).SingleOrDefault();

                    if (user == null)
                    {
                        User newUser = new User()
                        {
                            Id = GetNewUserId(),
                            Account = payload.Email,
                            Password = null,
                            Name = payload.Name,
                            CreateDate = DateTime.Now,
                            ProfileImage = await new HttpClient().GetByteArrayAsync(payload.Picture),
                            RegistType = Enum.GetName(RegistType.Google),
                        };

                        _easyNoteContext.Users.Add(newUser);
                        await _easyNoteContext.SaveChangesAsync();
                    }

                    user = (from a in _easyNoteContext.Users
                            where a.Account == payload.Email
                            && a.RegistType == Enum.GetName(RegistType.Google)
                            select a).SingleOrDefault();

                    var claims = new List<Claim>
                    {
                        new Claim(ClaimTypes.Sid, user.Id),
                        new Claim(ClaimTypes.Email, user.Account),
                        new Claim(ClaimTypes.Name, user.Name),
                        new Claim(ClaimTypes.Role, "User"),
                    };

                    var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                    HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(claimsIdentity));

                    HttpContext.Response.Cookies.Append("NoteNav", "show");

                    return Redirect("/Workspace");
                }
            }
            catch(Exception ex) {
                TempData["error"] = "unexpected error!";
                return Redirect("/Index");
            }
        }

        public async Task<GoogleJsonWebSignature.Payload?> VerifyGoogleToken(string? formCredential, string? formToken, string? cookiesToken)
        {
            // 檢查空值
            if (formCredential == null || formToken == null && cookiesToken == null)
            {
                return null;
            }

            GoogleJsonWebSignature.Payload? payload;
            try
            {
                // 驗證 token
                if (formToken != cookiesToken)
                {
                    return null;
                }

                // 驗證憑證
                IConfiguration Config = new ConfigurationBuilder().AddJsonFile("appSettings.json").Build();
                string GoogleApiClientId = Config.GetSection("GoogleApiClientId").Value;
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { GoogleApiClientId }
                };
                payload = await GoogleJsonWebSignature.ValidateAsync(formCredential, settings);
                if (!payload.Issuer.Equals("accounts.google.com") && !payload.Issuer.Equals("https://accounts.google.com"))
                {
                    return null;
                }
                if (payload.ExpirationTimeSeconds == null)
                {
                    return null;
                }
                else
                {
                    DateTime now = DateTime.Now.ToUniversalTime();
                    DateTime expiration = DateTimeOffset.FromUnixTimeSeconds((long)payload.ExpirationTimeSeconds).DateTime;
                    if (now > expiration)
                    {
                        return null;
                    }
                }
            }
            catch
            {
                return null;
            }
            return payload;
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterDTO registerDTO)
        {
            if (!registerDTO.Password.Equals(registerDTO.ConfirmPassword))
            {
                TempData["error"] = "Confirm Password not correct!";
                return Redirect("/?reg=true");
            }

            User? user = (from a in _easyNoteContext.Users
                          where a.Account == registerDTO.Account
                          && a.RegistType == Enum.GetName(RegistType.EasyNote)
                          select a).SingleOrDefault();

            if (user != null)
            {
                TempData["error"] = "Account already exist!";
                return Redirect("/?reg=true");
            }

            User newUser = new User()
            {
                Id = GetNewUserId(),
                Account = registerDTO.Account,
                Password = registerDTO.Password,
                Name = registerDTO.Name,
                CreateDate = DateTime.Now,
                ProfileImage = null,
                RegistType = Enum.GetName(RegistType.EasyNote),
            };

            _easyNoteContext.Users.Add(newUser);
            await _easyNoteContext.SaveChangesAsync();

            TempData["register_state"] = "complete";
            return Redirect("/");
        }

        private string GetNewUserId()
        {
            string? id = (from a in _easyNoteContext.Users orderby a.Id select a.Id).LastOrDefault();
            if (id == null)
                id = "U000000001";
            else
            {
                int num = Convert.ToInt32(id.Substring(1, id.Length - 1)) + 1;
                id = "U" + num.ToString("000000000");
            }
            return id;
        }

        public IActionResult Logout()
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("/");
        }

        [HttpPost]
        public IActionResult SetNavState([FromBody]string state)
        {
            Dictionary<string, bool> respon = new Dictionary<string, bool>();

            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                if (Request.Cookies.ContainsKey("NoteNav"))
                    HttpContext.Response.Cookies.Delete("NoteNav");

                HttpContext.Response.Cookies.Append("NoteNav", state);

                respon.Add("isSuccessed", true);
                return Json(respon);
            }
            catch (Exception ex)
            {
                respon.Add("isSuccessed", false);
                return Json(respon);
            }
        }

        public IActionResult ShowProfileImage(string userId)
        {
            byte[]? img = (from a in _easyNoteContext.Users
                           where a.Id == userId
                           select a.ProfileImage).SingleOrDefault();

            if (img != null)
                return File(img, "image/jpeg");
            return File("~/assets/profile_icon.png", "image/png");
        }

        /// <summary>
        /// 
        /// </summary>
        /// <returns>A list of Note, null if no note found</returns>
        private List<Note?> GetAllNotes()
        {
            string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
            List<Note?> notes = (from n in _easyNoteContext.Notes where n.UserId == userId select n).DefaultIfEmpty().ToList();
            if (notes.First() == null) return null;
            return notes;
        }

        // ------------------------------------------Workspace------------------------------------------
        [HttpGet]
        public IActionResult Workspace(string noteId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");


            return View("Workspace", new AllNotesDTO()
            {
                SelectedNoteId = noteId,
                Notes = GetAllNotes(),
            });
        }

        private string GetNotePath(string userId, string noteId)
        {
            return Path.Combine(_webHostEnvironment.WebRootPath, "notes", userId, noteId, noteId + ".html");
        }

        [HttpPost]
        public async Task<IActionResult> NewNote([FromBody] string userId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "User not login!",
                    NoteId = "",
                });

            string? noteId = (from a in _easyNoteContext.Notes 
                              where a.UserId == userId 
                              orderby a.NoteId 
                              select a.NoteId).LastOrDefault();
            if (noteId == null)
                noteId = "N000000001";
            else
            {
                int num = Convert.ToInt32(noteId.Substring(1, noteId.Length - 1)) + 1;
                noteId = "N" + num.ToString("000000000");
            }

            try
            {
                string notePath = GetNotePath(userId, noteId);
                Directory.GetParent(notePath).Create();
                System.IO.File.WriteAllText(notePath, "");

                Note note = new Note()
                {
                    UserId = userId,
                    NoteId = noteId,
                    NoteName = "Untitled",
                    CreateDate = DateTime.Now,
                    LastEditDate = DateTime.Now,
                };
                _easyNoteContext.Notes.Add(note);
                await _easyNoteContext.SaveChangesAsync();

                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = true,
                    ErrorMsg = "",
                    NoteId = noteId,
                });
            }
            catch (Exception ex)
            {
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Note not create correctly!",
                    NoteId = "",
                });
            }
        }

        [HttpPost]
        public IActionResult GetNote([FromBody] string noteId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
            Note? note = (from n in _easyNoteContext.Notes 
                          where n.UserId == userId && n.NoteId == noteId 
                          select n).FirstOrDefault();
            if (note == null)
                return Redirect("/");

            HtmlDocument htmlDocument = new HtmlDocument();
            htmlDocument.Load(GetNotePath(userId, noteId));
            return Json(new NoteContentDTO()
            {
                UserId = userId,
                NoteId = noteId,
                NoteName = note.NoteName,
                Content = htmlDocument.DocumentNode.InnerHtml,
            });
        }

        private HtmlNode? GetContentBlockChildNode(HtmlDocument htmlDocument, string ContentBlockId, string className)
        {
            Queue<HtmlNode> htmlNodes = new Queue<HtmlNode>();
            htmlNodes.Enqueue(htmlDocument.GetElementbyId(ContentBlockId));
            while (htmlNodes.Count > 0)
            {
                HtmlNode tmp = htmlNodes.Dequeue();
                if (tmp.HasClass(className))
                    return tmp;

                if (tmp.HasChildNodes)
                {
                    foreach (HtmlNode node in tmp.ChildNodes)
                    {
                        htmlNodes.Enqueue(node);
                    }
                }
            }
            return null;
        }

        [HttpPost]
        public async Task<IActionResult> EditNote([FromBody] NoteEditDTO noteEditDTO)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                Note? note = (from n in _easyNoteContext.Notes
                              where n.UserId == noteEditDTO.UserId && n.NoteId == noteEditDTO.NoteId
                              select n).FirstOrDefault();
                if (note == null)
                    return Json(new NoteStatusDTO()
                    {
                        IsSuccessed = false,
                        ErrorMsg = "Note not found!",
                        NoteId = noteEditDTO.NoteId,
                    });

                HtmlDocument htmlDocument = new HtmlDocument();
                string notePath = GetNotePath(noteEditDTO.UserId, noteEditDTO.NoteId);
                htmlDocument.Load(notePath);
                switch (Enum.Parse(typeof(NoteEditTypes), noteEditDTO.EditType))
                {
                    case NoteEditTypes.Name:
                        note.NoteName = noteEditDTO.NoteName;
                        break;

                    case NoteEditTypes.ContentAttribute:
                        HtmlNode content = GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content");
                        if (content == null)
                            throw new Exception();

                        string attributeName = noteEditDTO.Content.Split("=")[0];
                        string attributeValue = noteEditDTO.Content.Split("=")[1].Replace("\"", "");

                        content.SetAttributeValue(attributeName, attributeValue);
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditTypes.ContentObject:
                        HtmlNode contentObject = GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content-object");
                        if (contentObject == null)
                            throw new Exception();

                        contentObject.InnerHtml = noteEditDTO.Content;
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditTypes.ContentText:
                        HtmlNode contentText= GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content-text");
                        if (contentText == null)
                            throw new Exception();

                        HtmlDocument contentHD = new HtmlDocument();
                        contentHD.LoadHtml(noteEditDTO.Content);
                        contentText.ParentNode.ReplaceChild(contentHD.DocumentNode, contentText);
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditTypes.AddContentBlock:
                        if (!noteEditDTO.ContentBlockId.StartsWith("CB"))
                            throw new Exception();

                        HtmlNode contentBlock = CreateContentBlock(noteEditDTO.ContentBlockId, Enum.Parse<ContentObjectTypes>(noteEditDTO.ContentObjectType), Enum.Parse<ContentTextTypes>(noteEditDTO.ContentTextType));
                        htmlDocument.DocumentNode.AppendChild(contentBlock);
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditTypes.DeleteContentBlock:
                        contentBlock = htmlDocument.GetElementbyId(noteEditDTO.ContentBlockId);
                        if (contentBlock == null)
                            throw new Exception();

                        HtmlNode tmp = GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content-object");
                        if (tmp != null && tmp.GetAttributeValue("data-object-type", "").Equals(Enum.GetName(ContentObjectTypes.Image)))
                        {
                            HtmlNode imageNode = tmp.FirstChild;
                            try
                            {
                                System.IO.File.Delete(Path.Combine(_webHostEnvironment.WebRootPath, imageNode.GetAttributeValue("src", "")));
                            }
                            catch { }
                        }
                        contentBlock.Remove();
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditTypes.ContentBlockOrder:
                        HtmlNodeCollection hnc = htmlDocument.DocumentNode.ChildNodes;
                        HtmlNode targetNode = hnc[noteEditDTO.ContentBlockOldIndex];
                        hnc.RemoveAt(noteEditDTO.ContentBlockOldIndex);
                        hnc.Insert(noteEditDTO.ContentBlockNewIndex, targetNode);
                        htmlDocument.Save(notePath);
                        break;
                }
                note.LastEditDate = DateTime.Now;

                _easyNoteContext.Notes.Update(note);
                await _easyNoteContext.SaveChangesAsync();

                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = true,
                    ErrorMsg = "",
                    NoteId = noteEditDTO.NoteId,
                });
            }
            catch (Exception ex)
            {
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Unknowned error!",
                    NoteId = noteEditDTO.NoteId,
                });
            }
        }

        private HtmlNode CreateContentBlock(string id, ContentObjectTypes contentObjectType, ContentTextTypes contentTextType)
        {
            HtmlDocument document = new HtmlDocument();
            document.OptionUseIdAttribute = true;

            HtmlNode contentBlock = document.CreateElement("div");
            contentBlock.AddClass("content-block");
            contentBlock.SetAttributeValue("id", id);
            contentBlock.SetAttributeValue("tabindex", "-1");

            HtmlNode content = document.CreateElement("div");
            content.AddClass("content");
            content.SetAttributeValue("style", "flex-direction: column; align-items: center;");

            HtmlNode contentObject = document.CreateElement("div");
            contentObject.AddClass("content-object");
            contentObject.SetAttributeValue("data-object-type", Enum.GetName<ContentObjectTypes>(contentObjectType));
            content.AppendChild(contentObject);

            HtmlNode contentText = document.CreateElement("div");
            contentText.SetAttributeValue("contenteditable", "true");
            contentText.AddClass("content-text");
            contentText.SetAttributeValue("data-text-type", Enum.GetName<ContentTextTypes>(contentTextType));
            content.AppendChild(contentText);

            contentBlock.AppendChild(content);

            switch (contentObjectType)
            {
                case ContentObjectTypes.None:
                    content.RemoveChild(contentObject);
                    break;

                case ContentObjectTypes.Image:
                    HtmlNode image = document.CreateElement("img");
                    image.SetAttributeValue("width", "300");
                    image.SetAttributeValue("draggable", "false");
                    contentObject.AppendChild(image);
                    break;

                case ContentObjectTypes.Youtube:
                    HtmlNode youtubeFrame = document.CreateElement("iframe");
                    youtubeFrame.AddClass("yooutube_embed");
                    youtubeFrame.SetAttributeValue("width", "500");
                    youtubeFrame.SetAttributeValue("height", "300");
                    youtubeFrame.SetAttributeValue("allowfullscreen", "");
                    youtubeFrame.SetAttributeValue("picture-in-picture", "");
                    contentObject.AppendChild(youtubeFrame);
                    break;
            }

            switch (contentTextType)
            {
                case ContentTextTypes.None:
                    content.RemoveChild(contentText);
                    break;

                case ContentTextTypes.Heading1:
                    contentText.SetAttributeValue("style", "font-size: 2em;");
                    break;

                case ContentTextTypes.Heading2:
                    contentText.SetAttributeValue("style", "font-size: 1.5em;");
                    break;

                case ContentTextTypes.Heading3:
                    contentText.SetAttributeValue("style", "font-size: 1.17em;");
                    break;

                case ContentTextTypes.Text:
                    contentText.SetAttributeValue("style", "font-size: 16px;");
                    break;

                case ContentTextTypes.BulletList:
                    HtmlNode ul = document.CreateElement("ul");
                    HtmlNode li = document.CreateElement("li");
                    ul.AppendChild(li);
                    contentText.AppendChild(ul);
                    break;
            }

            return contentBlock;
        }

        [HttpPost]
        public async Task<IActionResult> DeleteNote([FromBody] string noteId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "You are not login!",
                    NoteId = noteId,
                });

            try
            {
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                Note? note = (from n in _easyNoteContext.Notes
                              where n.UserId == userId && n.NoteId == noteId
                              select n).FirstOrDefault();

                _easyNoteContext.Notes.Remove(note);
                await _easyNoteContext.SaveChangesAsync();

                string notePath = GetNotePath(userId, noteId);
                Directory.Delete(Directory.GetParent(notePath).FullName, true);

                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = true,
                    ErrorMsg = "",
                    NoteId = noteId,
                });
            }
            catch (Exception ex)
            {
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Unknown error!",
                    NoteId = noteId,
                });
            }
        }

        [HttpPost]
        public async Task<IActionResult> UploadFile([FromForm] FileDTO fileDTO)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Json(new UploadStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "You are not login!",
                    FilePath = "",
                });

            if (fileDTO == null)
                return Json(new UploadStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Unknown error!",
                    FilePath = "",
                });

            if (!fileDTO.File.ContentType.StartsWith("image/"))
                return Json(new UploadStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Image file only!",
                    FilePath = "",
                });

            try
            {
                // save image file
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                string noteFolderPath = Directory.GetParent(GetNotePath(userId, fileDTO.NoteId)).FullName;
                string fileName = $"F{DateTime.Now.Ticks.ToString()}.{fileDTO.File.FileName.Split(".").Last()}";
                string filePath = Path.Combine(noteFolderPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await fileDTO.File.CopyToAsync(stream);
                }

                // edit image src in given contentBlockId
                HtmlDocument htmlDocument = new HtmlDocument();
                string notePath = GetNotePath(userId, fileDTO.NoteId);
                htmlDocument.Load(notePath);

                HtmlNode? imageNode = GetContentBlockChildNode(htmlDocument, fileDTO.ContentBlockId, "content-object").FirstChild;
                string src = Path.GetRelativePath(Directory.GetParent(noteFolderPath).Parent.Parent.FullName, filePath);
                imageNode.SetAttributeValue("src", src);
                htmlDocument.Save(notePath);

                return Json(new UploadStatusDTO()
                {
                    IsSuccessed = true,
                    ErrorMsg = "",
                    FilePath = src,
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
                return Json(new UploadStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Unknown error!",
                    FilePath = "",
                });
            }
        }

        [HttpPost]
        public IActionResult MakePdf([FromBody] string noteId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "You are not login!",
                    NoteId = noteId,
                });

            try
            {
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                Note? note = (from n in _easyNoteContext.Notes
                              where n.UserId == userId && n.NoteId == noteId
                              select n).FirstOrDefault();

                if (note == null)
                    throw new Exception("Note not found!");

                string baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";

                HtmlDocument htmlDocument = new HtmlDocument();
                string notePath = GetNotePath(userId, noteId);
                htmlDocument.Load(notePath);

                HtmlNode title = htmlDocument.CreateElement("div");
                title.Id = "title";
                title.InnerHtml = note.NoteName;
                htmlDocument.DocumentNode.InsertBefore(title, htmlDocument.DocumentNode.FirstChild);

                HtmlNode link = htmlDocument.CreateElement("link");
                link.SetAttributeValue("rel", "stylesheet");
                link.SetAttributeValue("href", baseUrl + "/css/text-style.css");
                htmlDocument.DocumentNode.AppendChild(link);
                // bold font
                htmlDocument.DocumentNode.InnerHtml += 
                    "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">" +
                    "<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>" +
                    "<link href=\"https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@100..900&family=Special+Gothic+Expanded+One&display=swap\" rel=\"stylesheet\">";

                HtmlNode style = htmlDocument.CreateElement("style");
                style.InnerHtml = "*{font-family: 'Microsoft JhengHei UI';}" +
                                  "ul{margin: 0;}" +
                                  "#title{font-size: 38px;font-family: \"Noto Sans TC\", sans-serif;font-weight: 900;width: 100%;margin-bottom: 40px;padding: 0 20px;}" +
                                  ".content-block{width: 100%;padding: 10px;}" +
                                  ".content{width: 95%;max-width: 800px;margin-bottom: 20px;margin-left: auto;margin-right: auto;}" +
                                  ".content-object{vertical-align: middle;}" +
                                  ".content-object img{border-radius: 10px;}" +
                                  ".content-text{vertical-align: middle;padding: 0 10px;white-space: pre-wrap;word-wrap: break-word;word-break: break-all;}";
                htmlDocument.DocumentNode.AppendChild(style);

                foreach (var childNode in htmlDocument.DocumentNode.ChildNodes)
                {
                    if (!childNode.HasClass("content-block"))
                        continue;

                    HtmlNode? objectNode = GetContentBlockChildNode(htmlDocument, childNode.Id, "content-object");
                    HtmlNode? textNode = GetContentBlockChildNode(htmlDocument, childNode.Id, "content-text");

                    string textNodeStyle = textNode.GetAttributeValue("style", "");

                    if (objectNode != null)
                    {
                        string objectNodeStyle = objectNode.GetAttributeValue("style", "");
                        string type = objectNode.GetAttributeValue("data-object-type", "");
                        switch (Enum.Parse<ContentObjectTypes>(type))
                        {
                            case ContentObjectTypes.Image:
                                string src = objectNode.FirstChild.GetAttributeValue("src", "");
                                src = baseUrl + "/" + src;
                                objectNode.FirstChild.SetAttributeValue("src", src);
                                break;

                            case ContentObjectTypes.Youtube: // change iframe into a link
                                src = objectNode.FirstChild.GetAttributeValue("src", "");
                                string videoId = src.Split("/").Last();
                                src = "https://www.youtube.com/watch?v=" + videoId;

                                HtmlNode a = htmlDocument.CreateElement("a");
                                a.SetAttributeValue("href", src);
                                a.SetAttributeValue("width", objectNode.FirstChild.GetAttributeValue("width", ""));

                                HtmlNode img = htmlDocument.CreateElement("img");
                                img.SetAttributeValue("src", "https://img.youtube.com/vi/" + videoId + "/0.jpg");
                                img.SetAttributeValue("width", objectNode.FirstChild.GetAttributeValue("width", ""));
                                img.SetAttributeValue("height", objectNode.FirstChild.GetAttributeValue("height", ""));
                                a.AppendChild(img);

                                objectNode.FirstChild.Remove();
                                objectNode.AppendChild(a);
                                break;
                        }

                        string contentStyle = GetContentBlockChildNode(htmlDocument, childNode.Id, "content").GetAttributeValue("style", "");
                        contentStyle = Regex.Replace(contentStyle, @"\s+", string.Empty); // remove space
                        string[] contentStyles = contentStyle.Split(";", StringSplitOptions.RemoveEmptyEntries);
                        foreach (string str in contentStyles)
                        {
                            string[] tmp = str.Split(":");
                            switch (tmp[0])
                            {
                                case "flex-direction":
                                    if (tmp[1] == "row")
                                    {
                                        objectNodeStyle += "display: inline-block;";
                                        textNodeStyle += "display: inline-block;";
                                    }
                                    else if (tmp[1] == "row-reverse")
                                    {
                                        objectNodeStyle += "display: inline-block;";
                                        textNodeStyle += "display: inline-block;";
                                        textNode.Remove();
                                        objectNode.ParentNode.InsertBefore(textNode, objectNode);
                                    }
                                    break;
                                case "align-items":
                                    if (tmp[1] == "center")
                                    {
                                        objectNode.ParentNode.SetAttributeValue("style", "text-align: center;");
                                        textNodeStyle += "width: 100%;";
                                    }
                                    else
                                    {
                                        int width = 800 - 20 - Convert.ToInt32(objectNode.FirstChild.GetAttributeValue("width", "0"));
                                        textNodeStyle += $"width: {width}px;";
                                        if (tmp[1] == "end")
                                            objectNode.ParentNode.SetAttributeValue("style", "text-align: end;");
                                    }
                                    break;
                            }
                        }

                        objectNode.SetAttributeValue("style", objectNodeStyle);
                    }
                    else
                    {
                        textNodeStyle += "width: 100%;";
                    }
                    textNode.SetAttributeValue("style", textNodeStyle);
                }

                string ouputPath = Directory.GetParent(notePath).FullName + "/output/";
                Directory.CreateDirectory(ouputPath);
                System.IO.File.WriteAllText(ouputPath + note.NoteId + "_pdf.html", htmlDocument.DocumentNode.InnerHtml); // this file is just for checking

                HtmlToPdfDocument pdfDocument = new HtmlToPdfDocument()
                {
                    GlobalSettings = {
                        PaperSize = PaperKind.A4,
                        Orientation = Orientation.Portrait,
                        Margins = new MarginSettings { Top = 10, Bottom = 10, Left = 10, Right = 10 },
                    },
                    Objects = {
                        new ObjectSettings
                        {
                            HtmlContent = htmlDocument.DocumentNode.InnerHtml,
                        }
                    }
                };
                
                byte[] bytes = _converter.Convert(pdfDocument);
                System.IO.File.WriteAllBytes(ouputPath + note.NoteId + ".pdf", bytes);

                return Json(new
                {
                    IsSuccessed = true,
                    ErrorMsg = "",
                    NoteId = noteId,
                    Data = bytes // This will be base64-encoded in JSON
                });
            }
            catch (Exception ex)
            {
                return Json(new NoteStatusDTO()
                {
                    IsSuccessed = false,
                    ErrorMsg = "Unknown error!",
                    NoteId = noteId,
                });
            }
        }

        // ------------------------------------------Calendar------------------------------------------
        public IActionResult Calendar()
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            return View("Calendar", new AllNotesDTO()
            {
                SelectedNoteId = "",
                Notes = GetAllNotes(),
            });
        }

        [HttpPost]
        public IActionResult AllEventDatesInMonth([FromBody] string date)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                DateTime dateTimeMonthStart = DateTime.ParseExact(date, "yyyy/MM/dd HH:mm:ss:fff", System.Globalization.CultureInfo.InvariantCulture);
                DateTime dateTimeMonthEnd = dateTimeMonthStart.AddMonths(1);
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                List<Calendar?> calendars = (from c in _easyNoteContext.Calendars 
                                             where c.UserId == userId && 
                                             ((c.EventStartTime <= dateTimeMonthStart && c.EventEndTime >= dateTimeMonthStart) || 
                                             (c.EventStartTime >= dateTimeMonthStart && c.EventStartTime < dateTimeMonthEnd))
                                             select c).DefaultIfEmpty().ToList();

                List<DateTime> dateTimes = new List<DateTime>();
                calendars.ForEach((calendar) =>
                {
                    DateTime startTime = new DateTime(calendar.EventStartTime.Year, calendar.EventStartTime.Month, calendar.EventStartTime.Day);
                    if (startTime < dateTimeMonthStart)
                        startTime = startTime.AddDays((dateTimeMonthStart - startTime).Days);

                    DateTime endTime = calendar.EventEndTime > dateTimeMonthEnd ? dateTimeMonthEnd : calendar.EventEndTime;
                    for (; startTime < endTime; startTime = startTime.AddDays(1))
                    {
                        if(dateTimes.FindIndex(d => d.Day == startTime.Day) == -1)
                            dateTimes.Add(startTime);
                    }
                });
                return Json(dateTimes);
            }
            catch(Exception ex)
            {
                return Json(null);
            }
        }

        [HttpPost]
        public IActionResult AllEventsInDay([FromBody] string date)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                DateTime dateTimeDayStart = DateTime.ParseExact(date, "yyyy/MM/dd", System.Globalization.CultureInfo.InvariantCulture);
                DateTime dateTimeDayEnd = DateTime.ParseExact(date, "yyyy/MM/dd", System.Globalization.CultureInfo.InvariantCulture);
                dateTimeDayEnd = dateTimeDayEnd.AddDays(1);

                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                List<CalendarEventDTO?> calendarEvents = (from c in _easyNoteContext.Calendars
                                                          where c.UserId == userId && c.EventStartTime <= dateTimeDayEnd && c.EventEndTime >= dateTimeDayStart
                                                          select new CalendarEventDTO
                                                          {
                                                              EventId = c.EventId,
                                                              EventName = c.EventName,
                                                              EventContent = c.EventContent,
                                                              EventStartTime = c.EventStartTime,
                                                              EventEndTime = c.EventEndTime,
                                                          }).DefaultIfEmpty().ToList();

                return Json(calendarEvents);
            }
            catch (Exception ex)
            {
                return Json(null);
            }
        }

        private string GetNewEventId(string userId)
        {
            string? id = (from c in _easyNoteContext.Calendars where c.UserId == userId orderby c.EventId select c.EventId).LastOrDefault();
            if (id == null)
                id = "E000000001";
            else
            {
                int num = Convert.ToInt32(id.Substring(1, id.Length - 1)) + 1;
                id = "E" + num.ToString("000000000");
            }
            return id;
        }

        [HttpPost]
        public async Task<IActionResult> NewEvent([FromBody] Calendar calendar)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                calendar.UserId = userId;
                calendar.EventId = GetNewEventId(userId);
                calendar.CreateDate = DateTime.Now;

                _easyNoteContext.Calendars.Add(calendar);
                await _easyNoteContext.SaveChangesAsync();

                Dictionary<string, bool> respon = new Dictionary<string, bool>();
                respon.Add("isSuccessed", true);
                return Json(respon);
            }
            catch(Exception ex)
            {
                return Json(null);
            }
        }

        [HttpPost]
        public async Task<IActionResult> EditEvent([FromBody] Calendar calendar)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                Calendar? cal = (from c in _easyNoteContext.Calendars
                                 where c.UserId == userId && c.EventId == calendar.EventId
                                 select c).FirstOrDefault();
                if (cal == null)
                    throw new Exception("Event not found!");

                cal.EventName = calendar.EventName;
                cal.EventContent = calendar.EventContent;
                cal.EventStartTime = calendar.EventStartTime;
                cal.EventEndTime = calendar.EventEndTime;

                _easyNoteContext.Calendars.Update(cal);
                await _easyNoteContext.SaveChangesAsync();

                Dictionary<string, bool> respon = new Dictionary<string, bool>();
                respon.Add("isSuccessed", true);
                return Json(respon);
            }
            catch (Exception ex)
            {
                return Json(null);
            }
        }

        [HttpPost]
        public async Task<IActionResult> DeleteEvent([FromBody] string eventId)
        {
            if (User.Identity != null && !User.Identity.IsAuthenticated)
                return Redirect("/");

            try
            {
                string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
                Calendar? calendar = (from e in _easyNoteContext.Calendars
                                      where e.UserId == userId && e.EventId == eventId
                                      select e).FirstOrDefault();
                _easyNoteContext.Calendars.Remove(calendar);
                await _easyNoteContext.SaveChangesAsync();

                Dictionary<string, bool> respon = new Dictionary<string, bool>();
                respon.Add("isSuccessed", true);
                return Json(respon);
            }
            catch(Exception ex)
            {
                return Json(null);
            }
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
