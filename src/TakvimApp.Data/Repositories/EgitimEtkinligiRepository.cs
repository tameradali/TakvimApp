using TakvimApp.Domain.Entities;
using TakvimApp.Domain.Interfaces;

namespace TakvimApp.Data.Repositories;

public class EgitimEtkinligiRepository(VeritabaniYonetici db) : IEgitimEtkinligiRepository
{
    private static EgitimEtkinligi MapRow(System.Data.Common.DbDataReader r) => new()
    {
        Id               = r.GetInt32(0),
        HesapId          = r.GetInt32(1),
        GoogleEtkinlikId = r.GetString(2),
        Baslik           = r.GetString(3),
        BaslangicTarihi  = r.GetDateTime(4),
        BitisTarihi      = r.GetDateTime(5),
        Aciklama         = r.IsDBNull(6) ? null : r.GetString(6),
        GunlukFiyat      = r.IsDBNull(7) ? null : r.GetDecimal(7),
    };

    private const string SelectSql = @"
        SELECT e.Id, e.HesapId, e.GoogleEtkinlikId, e.Baslik,
               e.BaslangicTarihi, e.BitisTarihi, e.Aciklama, e.GunlukFiyat
        FROM EgitimEtkinlikleri e";

    public async Task<List<EgitimEtkinligi>> TumunuGetirAsync(int kullaniciId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + @"
            JOIN GoogleTakvimHesaplari h ON e.HesapId = h.Id
            WHERE h.KullaniciId = @kid
            ORDER BY e.BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid", kullaniciId);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<EgitimEtkinligi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<List<EgitimEtkinligi>> AralikGetirAsync(int kullaniciId, DateTime baslangic, DateTime bitis)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = SelectSql + @"
            JOIN GoogleTakvimHesaplari h ON e.HesapId = h.Id
            WHERE h.KullaniciId = @kid
              AND e.BaslangicTarihi <= @bitis
              AND e.BitisTarihi    >= @baslangic
            ORDER BY e.BaslangicTarihi";
        komut.Parameters.AddWithValue("@kid",      kullaniciId);
        komut.Parameters.AddWithValue("@baslangic", baslangic);
        komut.Parameters.AddWithValue("@bitis",     bitis);
        using var r  = await komut.ExecuteReaderAsync();
        var liste    = new List<EgitimEtkinligi>();
        while (await r.ReadAsync()) liste.Add(MapRow(r));
        return liste;
    }

    public async Task<int> EkleVeyaGuncelleAsync(EgitimEtkinligi etkinlik)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        // GunlukFiyat kasıtlı olarak güncellenmez — kullanıcının girdiği fiyatı korur
        komut.CommandText  = @"
            INSERT INTO EgitimEtkinlikleri
                (HesapId, GoogleEtkinlikId, Baslik, BaslangicTarihi, BitisTarihi, Aciklama)
            VALUES (@hesapId, @gid, @baslik, @bs, @bt, @ac)
            ON CONFLICT (HesapId, GoogleEtkinlikId) DO UPDATE
                SET Baslik           = EXCLUDED.Baslik,
                    BaslangicTarihi  = EXCLUDED.BaslangicTarihi,
                    BitisTarihi      = EXCLUDED.BitisTarihi,
                    Aciklama         = EXCLUDED.Aciklama
            RETURNING Id";
        komut.Parameters.AddWithValue("@hesapId", etkinlik.HesapId);
        komut.Parameters.AddWithValue("@gid",     etkinlik.GoogleEtkinlikId);
        komut.Parameters.AddWithValue("@baslik",  etkinlik.Baslik);
        komut.Parameters.AddWithValue("@bs",      etkinlik.BaslangicTarihi);
        komut.Parameters.AddWithValue("@bt",      etkinlik.BitisTarihi);
        komut.Parameters.AddWithValue("@ac",      (object?)etkinlik.Aciklama ?? DBNull.Value);
        return (int)(await komut.ExecuteScalarAsync())!;
    }

    public async Task FiyatGuncelleAsync(int id, decimal? gunlukFiyat)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "UPDATE EgitimEtkinlikleri SET GunlukFiyat = @fiyat WHERE Id = @id";
        komut.Parameters.AddWithValue("@fiyat", (object?)gunlukFiyat ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",    id);
        await komut.ExecuteNonQueryAsync();
    }

    public async Task HesabaGoreTemizleAsync(int hesapId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = "DELETE FROM EgitimEtkinlikleri WHERE HesapId = @hesapId";
        komut.Parameters.AddWithValue("@hesapId", hesapId);
        await komut.ExecuteNonQueryAsync();
    }
}
