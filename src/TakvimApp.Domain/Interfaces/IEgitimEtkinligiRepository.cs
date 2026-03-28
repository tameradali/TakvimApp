using TakvimApp.Domain.Entities;

namespace TakvimApp.Domain.Interfaces;

public interface IEgitimEtkinligiRepository
{
    Task<List<EgitimEtkinligi>> TumunuGetirAsync(int kullaniciId);
    Task<List<EgitimEtkinligi>> AralikGetirAsync(int kullaniciId, DateTime baslangic, DateTime bitis);
    Task<int> EkleVeyaGuncelleAsync(EgitimEtkinligi etkinlik);
    Task FiyatGuncelleAsync(int id, decimal? gunlukFiyat);
    Task EtkinlikBilgiGuncelleAsync(int id, decimal? gunlukFiyat, string etkinlikTuru, string? egitimTipi, decimal? masraf, int? kurumId);
    Task HesabaGoreTemizleAsync(int hesapId);
}
