namespace TakvimApp.Domain.Entities;

public class GoogleTakvimHesabi
{
    public int       Id                { get; set; }
    public int       KullaniciId       { get; set; }
    public string    HesapAdi          { get; set; } = string.Empty;
    public string    ServisHesabiJson  { get; set; } = string.Empty;
    public bool      AktifMi           { get; set; } = true;
    public DateTime? SonSenkronizasyon { get; set; }
}
