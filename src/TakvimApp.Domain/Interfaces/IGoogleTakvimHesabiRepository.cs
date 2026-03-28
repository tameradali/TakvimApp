using TakvimApp.Domain.Entities;

namespace TakvimApp.Domain.Interfaces;

public interface IGoogleTakvimHesabiRepository
{
    Task<List<GoogleTakvimHesabi>> TumunuGetirAsync(int kullaniciId);
    Task<List<GoogleTakvimHesabi>> TumAktifGetirAsync();
    Task<GoogleTakvimHesabi?> GetirAsync(int id);
    Task<int> EkleAsync(GoogleTakvimHesabi hesap);
    Task GuncelleAsync(GoogleTakvimHesabi hesap);
    Task SilAsync(int id);
    Task SonSenkronizasyonGuncelleAsync(int id, DateTime zaman);
}
