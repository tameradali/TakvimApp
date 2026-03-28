using TakvimApp.Domain;
using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class BeklenenEgitimRepository(VeritabaniYonetici db, AktifKullaniciServisi kullanici) : IBeklenenEgitimRepository
{
    private static BeklenenEgitim MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id                = r.GetInt32(0),
        KullaniciId       = r.GetInt32(1),
        Baslik            = r.GetString(2),
        BaslangicTarihi   = r.GetDateTime(3),
        BitisTarihi       = r.GetDateTime(4),
        GunlukFiyat       = r.GetDecimal(5),
        Notlar            = r.IsDBNull(6) ? null : r.GetString(6),
        OlusturulmaTarihi = r.GetDateTime(7),
    };

    private const string SelectSql = @"
        SELECT Id, KullaniciId, Baslik, BaslangicTarihi, BitisTarihi,
               GunlukFiyat, Notlar, OlusturulmaTarihi
        FROM BeklenenEgitimler";

    public async Task<List<BeklenenEgitim>> TumunuGetirAsync(int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE KullaniciId = @kid ORDER BY BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<BeklenenEgitim>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<List<BeklenenEgitim>> AralikGetirAsync(int kullaniciId, DateTime baslangic, DateTime bitis)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + @"
            WHERE KullaniciId = @kid
              AND BaslangicTarihi <= @bitis
              AND BitisTarihi    >= @baslangic
            ORDER BY BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid",      kullaniciId);
        komut.Parameters.AddWithValue("@baslangic", baslangic);
        komut.Parameters.AddWithValue("@bitis",     bitis);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<BeklenenEgitim>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<BeklenenEgitim?> GetirAsync(int id)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + " WHERE Id = @id AND KullaniciId = @kid";
        komut.Parameters.AddWithValue("@id",  id);
        komut.Parameters.AddWithValue("@kid", kullanici.KullaniciId);
        using var r = await komut.ExecuteReaderAsync();
        if (!await r.ReadAsync()) return null;
        return MapRow(r);
    }

    public async Task<int> EkleAsync(BeklenenEgitim egitim)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            INSERT INTO BeklenenEgitimler
                (KullaniciId, Baslik, BaslangicTarihi, BitisTarihi, GunlukFiyat, Notlar, OlusturulmaTarihi)
            VALUES (@kid, @baslik, @bs, @bt, @fiyat, @notlar, NOW())
            RETURNING Id";
        komut.Parameters.AddWithValue("@kid",    kullanici.KullaniciId);
        komut.Parameters.AddWithValue("@baslik", egitim.Baslik);
        komut.Parameters.AddWithValue("@bs",     egitim.BaslangicTarihi);
        komut.Parameters.AddWithValue("@bt",     egitim.BitisTarihi);
        komut.Parameters.AddWithValue("@fiyat",  egitim.GunlukFiyat);
        komut.Parameters.AddWithValue("@notlar", (object?)egitim.Notlar ?? DBNull.Value);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task GuncelleAsync(BeklenenEgitim egitim)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            UPDATE BeklenenEgitimler
            SET Baslik = @baslik, BaslangicTarihi = @bs, BitisTarihi = @bt,
                GunlukFiyat = @fiyat, Notlar = @notlar
            WHERE Id = @id AND KullaniciId = @kid";
        komut.Parameters.AddWithValue("@baslik", egitim.Baslik);
        komut.Parameters.AddWithValue("@bs",     egitim.BaslangicTarihi);
        komut.Parameters.AddWithValue("@bt",     egitim.BitisTarihi);
        komut.Parameters.AddWithValue("@fiyat",  egitim.GunlukFiyat);
        komut.Parameters.AddWithValue("@notlar", (object?)egitim.Notlar ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",     egitim.Id);
        komut.Parameters.AddWithValue("@kid",    kullanici.KullaniciId);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task SilAsync(int id)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "DELETE FROM BeklenenEgitimler WHERE Id = @id AND KullaniciId = @kid";
        komut.Parameters.AddWithValue("@id",  id);
        komut.Parameters.AddWithValue("@kid", kullanici.KullaniciId);
        await komut.ExecuteNonQueryAsync();
    }
}
