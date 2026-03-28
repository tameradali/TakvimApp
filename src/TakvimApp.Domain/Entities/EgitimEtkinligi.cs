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
    public string?  Yer              { get; set; }
    public decimal? GunlukFiyat      { get; set; }
    /// <summary>Egitim | Toplanti</summary>
    public string   EtkinlikTuru     { get; set; } = "Egitim";
    /// <summary>Yuzyuze | Online (sadece Egitim türü için)</summary>
    public string?  EgitimTipi       { get; set; }
    /// <summary>Yüzyüze eğitimlerde masraf (gelire eklenir)</summary>
    public decimal? Masraf           { get; set; }
}
