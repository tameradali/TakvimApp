using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TakvimApp.Api.Services;
using TakvimApp.Domain;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Api.Controllers;

[ApiController]
[Route("api/google-takvim")]
[Authorize]
public class GoogleTakvimController(
    IGoogleTakvimHesabiRepository hesapRepo,
    IEgitimEtkinligiRepository etkinlikRepo,
    GoogleTakvimSenkronizasyonServisi senkronServisi,
    AktifKullaniciServisi aktifKullanici) : ControllerBase
{
    public record HesapEkleRequest(string HesapAdi, string ServisHesabiJson);
    public record HesapGuncelleRequest(string HesapAdi, string ServisHesabiJson, bool AktifMi);

    // ── Hesap Listesi (JSON döndürme — güvenlik için ServisHesabiJson hariç)
    [HttpGet("hesaplar")]
    public async Task<IActionResult> HesaplariGetir()
    {
        var hesaplar = await hesapRepo.TumunuGetirAsync(aktifKullanici.KullaniciId);
        return Ok(hesaplar.Select(h => new
        {
            h.Id, h.KullaniciId, h.HesapAdi, h.AktifMi, h.SonSenkronizasyon
        }));
    }

    [HttpGet("hesaplar/{id}")]
    public async Task<IActionResult> HesapGetir(int id)
    {
        var hesap = await hesapRepo.GetirAsync(id);
        if (hesap is null || hesap.KullaniciId != aktifKullanici.KullaniciId)
            return NotFound();
        return Ok(hesap);
    }

    [HttpPost("hesaplar")]
    public async Task<IActionResult> HesapEkle([FromBody] HesapEkleRequest req)
    {
        var hesap = new GoogleTakvimHesabi
        {
            KullaniciId      = aktifKullanici.KullaniciId,
            HesapAdi         = req.HesapAdi,
            ServisHesabiJson = req.ServisHesabiJson,
            AktifMi          = true,
        };
        var id = await hesapRepo.EkleAsync(hesap);
        return Ok(new { id });
    }

    [HttpPut("hesaplar/{id}")]
    public async Task<IActionResult> HesapGuncelle(int id, [FromBody] HesapGuncelleRequest req)
    {
        var hesap = await hesapRepo.GetirAsync(id);
        if (hesap is null || hesap.KullaniciId != aktifKullanici.KullaniciId)
            return NotFound();

        hesap.HesapAdi         = req.HesapAdi;
        hesap.ServisHesabiJson = req.ServisHesabiJson;
        hesap.AktifMi          = req.AktifMi;
        await hesapRepo.GuncelleAsync(hesap);
        return NoContent();
    }

    [HttpDelete("hesaplar/{id}")]
    public async Task<IActionResult> HesapSil(int id)
    {
        var hesap = await hesapRepo.GetirAsync(id);
        if (hesap is null || hesap.KullaniciId != aktifKullanici.KullaniciId)
            return NotFound();

        await hesapRepo.SilAsync(id);
        return NoContent();
    }

    // ── Senkronizasyon
    [HttpPost("hesaplar/{id}/senkronize")]
    public async Task<IActionResult> SenkronizeEt(int id)
    {
        var hesap = await hesapRepo.GetirAsync(id);
        if (hesap is null || hesap.KullaniciId != aktifKullanici.KullaniciId)
            return NotFound();

        try
        {
            await senkronServisi.SenkronizeEtAsync(hesap);
            return Ok(new { mesaj = "Senkronizasyon tamamlandı." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { hata = ex.Message });
        }
    }

    [HttpPost("senkronize-tumu")]
    public async Task<IActionResult> TumunuSenkronizeEt()
    {
        var hesaplar = await hesapRepo.TumunuGetirAsync(aktifKullanici.KullaniciId);
        var hatalar  = new List<string>();

        foreach (var hesap in hesaplar.Where(h => h.AktifMi))
        {
            try { await senkronServisi.SenkronizeEtAsync(hesap); }
            catch (Exception ex) { hatalar.Add($"{hesap.HesapAdi}: {ex.Message}"); }
        }

        return Ok(new
        {
            mesaj         = $"{hesaplar.Count(h => h.AktifMi)} hesap senkronize edildi.",
            hatalar
        });
    }

    // ── Etkinlik fiyat güncelleme
    [HttpPatch("etkinlikler/{id}/fiyat")]
    public async Task<IActionResult> FiyatGuncelle(int id, [FromBody] FiyatRequest req)
    {
        await etkinlikRepo.FiyatGuncelleAsync(id, req.GunlukFiyat);
        return NoContent();
    }

    public record FiyatRequest(decimal? GunlukFiyat);
}
