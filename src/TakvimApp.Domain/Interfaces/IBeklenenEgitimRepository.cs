using TakvimApp.Domain.Entities;

namespace TakvimApp.Domain.Interfaces;

public interface IBeklenenEgitimRepository
{
    Task<List<BeklenenEgitim>> TumunuGetirAsync(int kullaniciId);
    Task<List<BeklenenEgitim>> AralikGetirAsync(int kullaniciId, DateTime baslangic, DateTime bitis);
    Task<BeklenenEgitim?> GetirAsync(int id);
    Task<int> EkleAsync(BeklenenEgitim egitim);
    Task GuncelleAsync(BeklenenEgitim egitim);
    Task SilAsync(int id);
}
