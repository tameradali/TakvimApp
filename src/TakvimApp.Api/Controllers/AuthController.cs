using Microsoft.AspNetCore.Mvc;
using TakvimApp.Api.Services;
using TakvimApp.Data;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(IKullaniciRepository repo, JwtServisi jwt) : ControllerBase
{
    public record LoginRequest(string KullaniciAdi, string Sifre);
    public record LoginResponse(string Token, string KullaniciAdi, int KullaniciId, string Rol);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.KullaniciAdi) || string.IsNullOrWhiteSpace(req.Sifre))
            return BadRequest("Kullanıcı adı ve şifre gereklidir.");

        var kullanici = await repo.GetByKullaniciAdiAsync(req.KullaniciAdi);
        if (kullanici is null)
            return Unauthorized("Kullanıcı adı veya şifre hatalı.");

        if (!VeritabaniYonetici.SifreDogrula(req.Sifre, kullanici.SifreHash))
            return Unauthorized("Kullanıcı adı veya şifre hatalı.");

        var token = jwt.TokenUret(kullanici);

        return Ok(new LoginResponse(token, kullanici.KullaniciAdi, kullanici.Id, kullanici.Rol));
    }
}
