using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using TakvimApp.Api.Services;
using TakvimApp.Data;
using TakvimApp.Data.Repositories;
using TakvimApp.Domain;
using TakvimApp.Domain.Interfaces;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("ics", c => {
    c.Timeout = TimeSpan.FromSeconds(30);
    c.DefaultRequestHeaders.Add("User-Agent", "TakvimApp/1.0");
});

// ── Veritabanı ──
string baglantiMetni =
    Environment.GetEnvironmentVariable("PG_CONNECTION_STRING")
    ?? OkuDosya(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "pg_connection.txt"),
                "Host=localhost;Database=TakvimApp;Username=postgres;Password=postgres");
builder.Services.AddSingleton(new VeritabaniYonetici(baglantiMetni));

static string OkuDosya(string yol, string varsayilan)
{
    if (!File.Exists(yol)) File.WriteAllText(yol, varsayilan);
    return File.ReadAllText(yol).Trim();
}

// ── JWT ──
var jwtServisi = new JwtServisi(builder.Configuration);
builder.Services.AddSingleton(jwtServisi);
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opts =>
    {
        opts.TokenValidationParameters = jwtServisi.ValidationParameters();
    });
builder.Services.AddAuthorization(opts =>
{
    opts.AddPolicy("AdminOnly", p => p.RequireClaim("rol", "admin"));
});

// ── Repository'ler ──
builder.Services.AddScoped<IKullaniciRepository,          KullaniciRepository>();
builder.Services.AddScoped<IGoogleTakvimHesabiRepository, GoogleTakvimHesabiRepository>();
builder.Services.AddScoped<IEgitimEtkinligiRepository,    EgitimEtkinligiRepository>();
builder.Services.AddScoped<IBeklenenEgitimRepository,     BeklenenEgitimRepository>();

// ── Kullanıcı bağlamı ──
builder.Services.AddScoped<AktifKullaniciServisi>();

// ── Servisler ──
builder.Services.AddScoped<GoogleTakvimSenkronizasyonServisi>();
builder.Services.AddScoped<GelirHesaplamaServisi>();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

// ── JWT → AktifKullaniciServisi middleware ──
app.Use(async (context, next) =>
{
    if (context.User.Identity?.IsAuthenticated == true)
    {
        var aktifKullanici = context.RequestServices.GetRequiredService<AktifKullaniciServisi>();
        var idStr  = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                  ?? context.User.FindFirst("sub")?.Value;
        var ad     = context.User.FindFirst(ClaimTypes.Name)?.Value
                  ?? context.User.FindFirst("name")?.Value ?? "";
        var email  = context.User.FindFirst("email")?.Value ?? "";
        var rol    = context.User.FindFirst("rol")?.Value ?? "tenant";
        if (int.TryParse(idStr, out var id))
            aktifKullanici.Ayarla(id, ad, email, rol);
    }
    await next();
});

app.MapControllers();
app.Run();
