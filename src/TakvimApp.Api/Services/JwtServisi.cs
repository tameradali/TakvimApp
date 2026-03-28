using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TakvimApp.Domain.Entities;

namespace TakvimApp.Api.Services;

public class JwtServisi(IConfiguration config)
{
    private readonly string _secret =
        config["JWT_SECRET"]
        ?? Environment.GetEnvironmentVariable("JWT_SECRET")
        ?? "TakvimAppDefaultSecretKey_ChangeInProduction_2026!";

    public string TokenUret(Kullanici kullanici)
    {
        var key    = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds  = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiry = DateTime.UtcNow.AddDays(30);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub,  kullanici.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Name, kullanici.KullaniciAdi),
            new Claim("email",                      kullanici.Email),
            new Claim("adsoyad",                    kullanici.AdSoyad),
            new Claim("rol",                        kullanici.Rol),
        };

        var token = new JwtSecurityToken(
            issuer:             "takvimapp",
            audience:           "takvimapp",
            claims:             claims,
            expires:            expiry,
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public TokenValidationParameters ValidationParameters() => new()
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = "takvimapp",
        ValidAudience            = "takvimapp",
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret)),
    };
}
