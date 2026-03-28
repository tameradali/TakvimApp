namespace TakvimApp.Domain.Entities;

public class EgitimEtkinligi
{
    public int      Id               { get; set; }
    public int      HesapId          { get; set; }
    public string   GoogleEtkinlikId { get; set; } = string.Empty;
    public string   Baslik           { get; set; } = string.Empty;
    public DateTime BaslangicTarihi  { get; set; }
    public DateTime BitisTarihi      { get; set; }
    public string?  Aciklama         { get; set; }
    public decimal? GunlukFiyat      { get; set; }
}
