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
        Aciklama         = r.IsDBNull(6)  ? null : r.GetString(6),
        GunlukFiyat      = r.IsDBNull(7)  ? null : r.GetDecimal(7),
        Yer              = r.IsDBNull(8)  ? null : r.GetString(8),
        EtkinlikTuru     = r.IsDBNull(9)  ? "Egitim" : r.GetString(9),
        EgitimTipi       = r.IsDBNull(10) ? null : r.GetString(10),
        Masraf           = r.IsDBNull(11) ? null : r.GetDecimal(11),
        KurumId          = r.IsDBNull(12) ? null : r.GetInt32(12),
        KurumAdi         = r.IsDBNull(13) ? null : r.GetString(13),
    };

    private const string SelectSql = @"
        SELECT e.Id, e.HesapId, e.GoogleEtkinlikId, e.Baslik,
               e.BaslangicTarihi, e.BitisTarihi, e.Aciklama, e.GunlukFiyat,
               e.Yer, e.EtkinlikTuru, e.EgitimTipi, e.Masraf,
               e.KurumId, k.Ad AS KurumAdi
        FROM EgitimEtkinlikleri e
        LEFT JOIN Kurumlar k ON e.KurumId = k.Id";

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
        // GunlukFiyat, EtkinlikTuru, EgitimTipi, Masraf kasıtlı olarak güncellenmez — kullanıcı girişini korur
        komut.CommandText  = @"
            INSERT INTO EgitimEtkinlikleri
                (HesapId, GoogleEtkinlikId, Baslik, BaslangicTarihi, BitisTarihi, Aciklama, Yer)
            VALUES (@hesapId, @gid, @baslik, @bs, @bt, @ac, @yer)
            ON CONFLICT (HesapId, GoogleEtkinlikId) DO UPDATE
                SET Baslik           = EXCLUDED.Baslik,
                    BaslangicTarihi  = EXCLUDED.BaslangicTarihi,
                    BitisTarihi      = EXCLUDED.BitisTarihi,
                    Aciklama         = EXCLUDED.Aciklama,
                    Yer              = EXCLUDED.Yer
            RETURNING Id";
        komut.Parameters.AddWithValue("@hesapId", etkinlik.HesapId);
        komut.Parameters.AddWithValue("@gid",     etkinlik.GoogleEtkinlikId);
        komut.Parameters.AddWithValue("@baslik",  etkinlik.Baslik);
        komut.Parameters.AddWithValue("@bs",      etkinlik.BaslangicTarihi);
        komut.Parameters.AddWithValue("@bt",      etkinlik.BitisTarihi);
        komut.Parameters.AddWithValue("@ac",      (object?)etkinlik.Aciklama ?? DBNull.Value);
        komut.Parameters.AddWithValue("@yer",     (object?)etkinlik.Yer ?? DBNull.Value);
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

    public async Task EtkinlikBilgiGuncelleAsync(int id, decimal? gunlukFiyat, string etkinlikTuru, string? egitimTipi, decimal? masraf, int? kurumId)
    {
        using var baglanti = db.BaglantiAc();
        using var komut    = baglanti.CreateCommand();
        komut.CommandText  = @"
            UPDATE EgitimEtkinlikleri
            SET GunlukFiyat  = @fiyat,
                EtkinlikTuru = @tur,
                EgitimTipi   = @tip,
                Masraf       = @masraf,
                KurumId      = @kurumId
            WHERE Id = @id";
        komut.Parameters.AddWithValue("@fiyat",   (object?)gunlukFiyat ?? DBNull.Value);
        komut.Parameters.AddWithValue("@tur",      etkinlikTuru);
        komut.Parameters.AddWithValue("@tip",      (object?)egitimTipi ?? DBNull.Value);
        komut.Parameters.AddWithValue("@masraf",   (object?)masraf ?? DBNull.Value);
        komut.Parameters.AddWithValue("@kurumId",  (object?)kurumId ?? DBNull.Value);
        komut.Parameters.AddWithValue("@id",       id);
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
