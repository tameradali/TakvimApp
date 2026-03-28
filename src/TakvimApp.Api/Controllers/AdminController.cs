using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Data;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(IKullaniciRepository repo) : ControllerBase
{
    public record KullaniciOlusturRequest(string KullaniciAdi, string Email, string AdSoyad, string Sifre, string Rol);
    public record RolGuncelleRequest(string Rol);
    public record SifreGuncelleRequest(string YeniSifre);

    [HttpGet("kullanicilar")]
    public async Task<IActionResult> KullanicilariGetir()
    {
        var liste = await repo.TumunuGetirAsync();
        return Ok(liste.Select(k => new
        {
            k.Id, k.KullaniciAdi, k.Email, k.AdSoyad, k.Rol, k.OlusturulmaTarihi
        }));
    }

    [HttpPost("kullanicilar")]
    public async Task<IActionResult> KullaniciOlustur([FromBody] KullaniciOlusturRequest req)
    {
        var sifreHash = VeritabaniYonetici.SifreHashle(req.Sifre);
        var kullanici = new Kullanici
        {
            KullaniciAdi = req.KullaniciAdi,
            Email        = req.Email,
            AdSoyad      = req.AdSoyad,
            SifreHash    = sifreHash,
            Rol          = req.Rol,
        };
        var id = await repo.OlusturAsync(kullanici);
        return Ok(new { id });
    }

    [HttpPut("kullanicilar/{id}/rol")]
    public async Task<IActionResult> RolGuncelle(int id, [FromBody] RolGuncelleRequest req)
    {
        await repo.RolGuncelleAsync(id, req.Rol);
        return NoContent();
    }

    [HttpPut("kullanicilar/{id}/sifre")]
    public async Task<IActionResult> SifreGuncelle(int id, [FromBody] SifreGuncelleRequest req)
    {
        var hash = VeritabaniYonetici.SifreHashle(req.YeniSifre);
        await repo.SifreGuncelleAsync(id, hash);
        return NoContent();
    }
}
