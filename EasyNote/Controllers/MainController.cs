using EasyNote.DTOs;
using EasyNote.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Security.Claims;

namespace EasyNote.Controllers
{
    public class MainController : Controller
    {
        private readonly EasyNoteContext _easyNoteContext;

        public MainController(EasyNoteContext easyNoteContext)
        {
            _easyNoteContext = easyNoteContext;
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
            var user = (from a in _easyNoteContext.Users
                        where a.Account == loginDTO.Account
                        && a.Password == loginDTO.Password
                        select a).SingleOrDefault();

            if (user == null)
            {
                TempData["error"] = "Wrong account or password!";
                return Redirect("/Index");
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Email, user.Account),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Role, "User")
            };

            var claimsIdentity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, new ClaimsPrincipal(claimsIdentity));
            return Redirect("/Workspace");
        }

        public IActionResult Workspace()
        {
            if (!User.Identity.IsAuthenticated)
                return Redirect("/Index");
            return View();
        }

        public IActionResult Logout()
        {
            HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
            return Redirect("/Index");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
