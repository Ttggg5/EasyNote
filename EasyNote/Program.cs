using DinkToPdf.Contracts;
using DinkToPdf;
using EasyNote.Models;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddDbContext<EasyNoteContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("MainDatabase"), sqlServerOptions =>
    sqlServerOptions.EnableRetryOnFailure()));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options => {
        options.LoginPath = new PathString("/Login");
        options.LogoutPath = new PathString("/Login");
    });

builder.Services.AddSingleton<IConverter>(new SynchronizedConverter(new PdfTools()));

builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(10);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseSession();

app.UseRouting();

app.UseCookiePolicy();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Main}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "main",
    pattern: "{action=Index}",
    defaults: new { controller = "Main" });

app.Run();
