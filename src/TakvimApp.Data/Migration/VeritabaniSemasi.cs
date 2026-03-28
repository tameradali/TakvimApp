namespace TakvimApp.Data.Migration;

public static class VeritabaniSemasi
{
    public const string TabloOlusturmaSorgusu = @"
        CREATE TABLE IF NOT EXISTS Kullanicilar (
            Id                SERIAL PRIMARY KEY,
            KullaniciAdi      TEXT NOT NULL DEFAULT 'admin',
            Email             TEXT NOT NULL UNIQUE,
            AdSoyad           TEXT NOT NULL,
            SifreHash         TEXT NOT NULL DEFAULT '',
            Rol               VARCHAR(20) NOT NULL DEFAULT 'tenant',
            OlusturulmaTarihi TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS GoogleTakvimHesaplari (
            Id                SERIAL PRIMARY KEY,
            KullaniciId       INTEGER NOT NULL REFERENCES Kullanicilar(Id),
            HesapAdi          TEXT NOT NULL,
            ServisHesabiJson  TEXT NOT NULL,
            AktifMi           BOOLEAN NOT NULL DEFAULT TRUE,
            SonSenkronizasyon TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS EgitimEtkinlikleri (
            Id               SERIAL PRIMARY KEY,
            HesapId          INTEGER NOT NULL REFERENCES GoogleTakvimHesaplari(Id) ON DELETE CASCADE,
            GoogleEtkinlikId TEXT NOT NULL,
            Baslik           TEXT NOT NULL,
            BaslangicTarihi  TIMESTAMP NOT NULL,
            BitisTarihi      TIMESTAMP NOT NULL,
            Aciklama         TEXT,
            GunlukFiyat      NUMERIC(10,2),
            UNIQUE(HesapId, GoogleEtkinlikId)
        );

        CREATE TABLE IF NOT EXISTS BeklenenEgitimler (
            Id                SERIAL PRIMARY KEY,
            KullaniciId       INTEGER NOT NULL REFERENCES Kullanicilar(Id),
            Baslik            TEXT NOT NULL,
            BaslangicTarihi   TIMESTAMP NOT NULL,
            BitisTarihi       TIMESTAMP NOT NULL,
            GunlukFiyat       NUMERIC(10,2) NOT NULL DEFAULT 0,
            Notlar            TEXT,
            OlusturulmaTarihi TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS Kurumlar (
            Id                SERIAL PRIMARY KEY,
            KullaniciId       INTEGER NOT NULL REFERENCES Kullanicilar(Id),
            Ad                TEXT NOT NULL,
            Notlar            TEXT,
            OlusturulmaTarihi TIMESTAMP NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_kurumlar_kullanici ON Kurumlar(KullaniciId);

        CREATE INDEX IF NOT EXISTS idx_egitimetkinlikleri_hesapid  ON EgitimEtkinlikleri(HesapId);
        CREATE INDEX IF NOT EXISTS idx_egitimetkinlikleri_tarih    ON EgitimEtkinlikleri(BaslangicTarihi, BitisTarihi);
        CREATE INDEX IF NOT EXISTS idx_beklenegitimler_kullanici   ON BeklenenEgitimler(KullaniciId);
        CREATE INDEX IF NOT EXISTS idx_beklenegitimler_tarih       ON BeklenenEgitimler(BaslangicTarihi, BitisTarihi);
    ";
}
