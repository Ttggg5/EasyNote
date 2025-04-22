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

        public MainController(EasyNoteContext easyNoteContext, IWebHostEnvironment webHostEnvironment)
        {
            _easyNoteContext = easyNoteContext;
            _webHostEnvironment = webHostEnvironment;
        }

        public IActionResult Index()
        {
            if (User.Identity.IsAuthenticated)
                return Redirect("/Workspace");
            return View();
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
                        new Claim(ClaimTypes.Role, "User")
                    };

                    var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
                    HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(claimsIdentity));
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

        [HttpHead]
        [HttpGet]
        public IActionResult Workspace(string noteId)
        {
            if (!User.Identity.IsAuthenticated)
                return Redirect("/");


            return View("Workspace", new AllNotesDTO()
            {
                SelectedNoteId = noteId,
                Notes = GetAllNotes(),
            });
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

        private List<Note?> GetAllNotes()
        {
            string userId = User.Claims.First(claim => claim.Type == ClaimTypes.Sid).Value;
            List<Note?> notes = (from n in _easyNoteContext.Notes where n.UserId == userId select n).DefaultIfEmpty().ToList();
            return notes;
        }

        private string GetNotePath(string userId, string noteId)
        {
            return Path.Combine(_webHostEnvironment.WebRootPath, "notes", userId, noteId, noteId + ".html");
        }

        [HttpPost]
        public async Task<IActionResult> NewNote([FromBody] string userId)
        {
            if (!User.Identity.IsAuthenticated)
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
            if (!User.Identity.IsAuthenticated)
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
            return (from c in htmlDocument.GetElementbyId(ContentBlockId).ChildNodes
                    where c.HasClass(className)
                    select c).FirstOrDefault();
        }

        [HttpPost]
        public async Task<IActionResult> EditNote([FromBody] NoteEditDTO noteEditDTO)
        {
            if (!User.Identity.IsAuthenticated)
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
                switch (Enum.Parse(typeof(NoteEditType), noteEditDTO.EditType))
                {
                    case NoteEditType.Name:
                        note.NoteName = noteEditDTO.NoteName;
                        break;

                    case NoteEditType.Content:
                        HtmlNode content= GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content");
                        if (content == null)
                            throw new Exception();

                        HtmlDocument contentHD = new HtmlDocument();
                        contentHD.LoadHtml(noteEditDTO.Content);
                        htmlDocument.GetElementbyId(noteEditDTO.ContentBlockId).ReplaceChild(contentHD.DocumentNode, content);
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditType.AddContentBlock:
                        if (!noteEditDTO.ContentBlockId.StartsWith("CB"))
                            throw new Exception();

                        HtmlNode contentBlock = CreateContentBlock(noteEditDTO.ContentBlockId, noteEditDTO.ContentBlockType);
                        htmlDocument.DocumentNode.AppendChild(contentBlock);
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditType.DeleteContentBlock:
                        contentBlock = htmlDocument.GetElementbyId(noteEditDTO.ContentBlockId);
                        if (contentBlock == null)
                            throw new Exception();

                        if (contentBlock.GetAttributeValue("data-type", "").Equals("image"))
                        {
                            HtmlNode imageNode = GetContentBlockChildNode(htmlDocument, noteEditDTO.ContentBlockId, "content-image");
                            try
                            {
                                System.IO.File.Delete(Path.Combine(_webHostEnvironment.WebRootPath, imageNode.GetAttributeValue("src", "")));
                            }
                            catch { }
                        }
                        contentBlock.Remove();
                        htmlDocument.Save(notePath);
                        break;

                    case NoteEditType.ContentBlockOrder:
                        HtmlNodeCollection hnc = htmlDocument.DocumentNode.ChildNodes;
                        HtmlNode tmp = hnc[noteEditDTO.ContentBlockOldIndex];
                        hnc.RemoveAt(noteEditDTO.ContentBlockOldIndex);
                        hnc.Insert(noteEditDTO.ContentBlockNewIndex, tmp);
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

        private HtmlNode CreateContentBlock(string id, string contentBlockType)
        {
            HtmlDocument document = new HtmlDocument();
            document.OptionUseIdAttribute = true;

            HtmlNode contentBlock = document.CreateElement("div");
            contentBlock.AddClass("content-block");
            contentBlock.SetAttributeValue("id", id);
            contentBlock.SetAttributeValue("tabindex", "-1");
            contentBlock.SetAttributeValue("data-type", contentBlockType);

            HtmlNode content = document.CreateElement("div");
            content.SetAttributeValue("contenteditable", "true");
            content.AddClass("content");

            if (contentBlockType.Equals("image"))
            {
                content.AddClass("content-auto-width");
                HtmlNode image = document.CreateElement("img");
                image.SetAttributeValue("width", "300");
                image.AddClass("content-image");
                contentBlock.AppendChild(image);
            }
            contentBlock.AppendChild(content);

            return contentBlock;
        }

        [HttpPost]
        public async Task<IActionResult> DeleteNote([FromBody] string noteId)
        {
            if (!User.Identity.IsAuthenticated)
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
                System.IO.File.Delete(notePath);

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
            if (!User.Identity.IsAuthenticated)
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
                string fileName = $"F{DateTime.Now.Ticks.ToString()}.{fileDTO.File.FileName}";
                string filePath = Path.Combine(noteFolderPath, fileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await fileDTO.File.CopyToAsync(stream);
                }

                // edit image src in given contentBlockId
                HtmlDocument htmlDocument = new HtmlDocument();
                string notePath = GetNotePath(userId, fileDTO.NoteId);
                htmlDocument.Load(notePath);

                HtmlNode? imageNode = GetContentBlockChildNode(htmlDocument, fileDTO.ContentBlockId, "content-image");
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

        public IActionResult Logout()
        {
            HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("/");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
