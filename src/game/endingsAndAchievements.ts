import { GAME_MODES, PLAYER_ROLES, REGIONS } from '../data/categoriesAndEras';
import { CHARACTER_MAP, CHARACTERS } from '../data/characters';
import {
  AchievementDefinition,
  GameEndSummary,
  GameRunState,
  IndicatorKey,
} from '../types/game';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'ach_iron_balance_100',
    title: 'Sarsılmaz Taht',
    description: '100 karar boyunca hiçbir göstergeyi 20’nin altına düşürmeden hüküm sür.',
    iconName: 'shield',
  },
  {
    id: 'ach_loyal_companion',
    title: 'Kan ve Yemin Dostu',
    description: 'Bir ana karakterle +85 veya üzeri maksimum sadakat ilişkisi kur.',
    iconName: 'heart',
  },
  {
    id: 'ach_romance_bloom',
    title: 'Buz ve Ateşin Kalbi',
    description: 'Bir karakterle karşılıklı güvene dayalı romantik bir bağ kur.',
    isSecret: true,
    iconName: 'heart',
  },
  {
    id: 'ach_save_ned_stark',
    title: 'Kurdun Kurtuluşu',
    description: 'Ned Stark’ı King’s Landing kumpasından sağ kurtararak tarihi değiştir.',
    isSecret: true,
    iconName: 'sword',
  },
  {
    id: 'ach_prevent_red_wedding',
    title: 'Kızıl Düğün’ü Bozan El',
    description: 'Walder Frey ve Roose Bolton’ın Kızıl Düğün ihanetini engelleyip Robb Stark’ı yaşat.',
    isSecret: true,
    iconName: 'shield',
  },
  {
    id: 'ach_defeat_night_king',
    title: 'Şafağın Kalkanı',
    description: 'Night King ve ölüler ordusunu yenerek Uzun Gece’yi sona erdir.',
    isSecret: true,
    iconName: 'dragon',
  },
  {
    id: 'ach_golden_age_90',
    title: 'Altın Çağ Hükümdarı',
    description: 'Dört temel göstergenin tamamını aynı anda 85 veya üzerine çıkar.',
    isSecret: true,
    iconName: 'crown',
  },
  {
    id: 'ach_diplomat_10_friends',
    title: 'Büyük Konsey Mimarı',
    description: 'Aynı oyunda en az 10 farklı karakterle olumlu (+25 üstü) ilişki kur.',
    iconName: 'scroll',
  },
  {
    id: 'ach_win_quick',
    title: 'Fırtınadan Sağ Çıkan (300 Karar)',
    description: 'Hızlı Mod’da 300 kararı başarıyla tamamla.',
    iconName: 'crown',
  },
  {
    id: 'ach_win_normal',
    title: 'Yedi Krallık Hakimi (600 Karar)',
    description: 'Normal Mod’da 600 kararı başarıyla tamamla.',
    iconName: 'crown',
  },
  {
    id: 'ach_win_long',
    title: 'Bin Yıllık Hanedan (1.200 Karar)',
    description: 'Uzun Mod’da 1.200 kararı başarıyla tamamla.',
    iconName: 'dragon',
  },
  {
    id: 'ach_win_competitive',
    title: 'Demir Taht’ın Ölümsüz Efsanesi (6.000 Karar)',
    description: 'Rekabetçi Mod’da 6.000 kararı tamamlayarak Westeros tarihine geç.',
    isSecret: true,
    iconName: 'crown',
  },
];

export function evaluateUnlockedAchievements(
  state: GameRunState,
  existingUnlocked: string[]
): string[] {
  const unlocked = new Set(existingUnlocked);

  if (state.maxStreak20Reached >= 100) unlocked.add('ach_iron_balance_100');

  const charStates = Object.values(state.characters);
  if (charStates.some((c) => c.relation >= 85)) unlocked.add('ach_loyal_companion');
  if (charStates.some((c) => c.isRomanced)) unlocked.add('ach_romance_bloom');
  if (charStates.filter((c) => c.relation >= 25).length >= 10) {
    unlocked.add('ach_diplomat_10_friends');
  }

  if (state.flags.includes('ned_stark_saved')) unlocked.add('ach_save_ned_stark');
  if (state.flags.includes('red_wedding_prevented')) unlocked.add('ach_prevent_red_wedding');
  if (state.flags.includes('night_king_defeated')) unlocked.add('ach_defeat_night_king');

  const ind = state.indicators;
  if (ind.people >= 85 && ind.military >= 85 && ind.treasury >= 85 && ind.nobles >= 85) {
    unlocked.add('ach_golden_age_90');
  }

  if (state.status === 'victory') {
    if (state.modeId === 'quick') unlocked.add('ach_win_quick');
    if (state.modeId === 'normal') unlocked.add('ach_win_normal');
    if (state.modeId === 'long') unlocked.add('ach_win_long');
    if (state.modeId === 'competitive') unlocked.add('ach_win_competitive');
  }

  return Array.from(unlocked);
}

function getTopCharacterFates(state: GameRunState) {
  return Object.values(state.characters)
    .sort((a, b) => Math.abs(b.relation) - Math.abs(a.relation))
    .slice(0, 6)
    .map((c) => {
      const def = CHARACTER_MAP[c.id] || CHARACTERS[0];
      const statusMap: Record<string, string> = {
        alive: 'Hayatta',
        dead: 'Öldü',
        captured: 'Esir',
        exiled: 'Sürgünde',
        missing: 'Kayıp',
      };
      return {
        id: c.id,
        name: def.name,
        status: statusMap[c.status] || 'Hayatta',
        relation: c.relation,
      };
    });
}

/**
 * Generates contextual defeat endings based on which indicator hit 0, current region, era, and flags (Section 11).
 */
export function buildDefeatEnding(
  state: GameRunState,
  triggerIndicator: IndicatorKey
): GameEndSummary {
  const regionMeta = REGIONS[state.currentRegion];
  const roleMeta = PLAYER_ROLES.find((r) => r.id === state.roleId) || PLAYER_ROLES[0];
  const titlePrefix = roleMeta.titlePrefix;
  const variantIdx = (state.turn + state.journal.length) % 4;

  const worstEnemy = Object.values(state.characters)
    .filter((c) => c.status === 'alive')
    .sort((a, b) => a.relation - b.relation)[0];
  const enemyName = worstEnemy ? CHARACTER_MAP[worstEnemy.id]?.name : 'Rakip Hanedanlar';

  if (triggerIndicator === 'people') {
    const peopleEndings = [
      {
        id: 'defeat_people_rebellion',
        title: 'Kızıl Meydan Ayaklanması ve Halkın Gazabı',
        subtitle: `${regionMeta.name} Sokaklarında Devrilen Sancak`,
        cause: 'Halkın Desteği sıfırlandı: Açlık ve ağır vergiler büyük bir halk ayaklanmasına dönüştü.',
        story: `${titlePrefix} ${state.playerName}, ${regionMeta.name} sokaklarında sabrı tükenen binlerce köylü, demirci ve şehirli meşalelerle saray kapılarını kırdı. Muhafızların bile aç halkın üzerine kılıç çekmeyi reddetti. Yükselen alevlerin arasında yönetimin son buldu.`,
      },
      {
        id: 'defeat_people_faith_uprising',
        title: 'Yedi’nin Gazabı ve Fanatik Kalkışma',
        subtitle: 'Tapınak Çanları Senin Sonun İçin Çaldı',
        cause: 'Halkın Desteği sıfırlandı: Dini fanatikler ve yoksul kitleler yönetimi devirdi.',
        story: `Halkın sana olan güveni tamamen tükendiğinde, çul giymiş binlerce fanatik ${regionMeta.name} meydanlarını ele geçirdi. ${titlePrefix} ${state.playerName}, halk mahkemesinde yargılanarak tüm unvanlarından mahrum bırakıldın ve Essos’a sürgüne gönderildin.`,
      },
      {
        id: 'defeat_people_city_defection',
        title: 'Açılan Kale Kapıları',
        subtitle: 'Halk Seni Düşmanlarına Teslim Etti',
        cause: 'Halkın Desteği sıfırlandı: Şehir halkı sur kapılarını içeriden rakiplerine açtı.',
        story: `${enemyName} orduları surların önüne geldiğinde, senden yüz çeviren ${regionMeta.name} halkı tek bir ok bile atmadan ana kapıları ardına kadar açtı. Kendi halkının sessiz bakışları arasında esir alındın.`,
      },
      {
        id: 'defeat_people_winter_riot',
        title: 'Kış Kıyameti ve Yağmalanan Ambarlar',
        subtitle: 'Açlığın Yıktığı Hükümdarlık',
        cause: 'Halkın Desteği sıfırlandı: Kıtlık ve umutsuzluk yönetimi içten çökertti.',
        story: `Soğuk rüzgârlar ${regionMeta.name} sokaklarını kasıp kavururken halk son erzak kervanlarını yağmaladı. ${titlePrefix} ${state.playerName}, kimsenin emirlerini dinlemediği buz tutmuş bir kalede yapayalnız kaldın.`,
      },
    ];
    const picked = peopleEndings[variantIdx];
    return {
      isVictory: false,
      endingId: picked.id,
      title: picked.title,
      subtitle: picked.subtitle,
      storyText: picked.story,
      causeOfEnd: picked.cause,
      triggerIndicator,
      canUpgradeMode: false,
      keyCharacterFates: getTopCharacterFates(state),
    };
  }

  if (triggerIndicator === 'military') {
    const isLongNight = state.eraId === 'long_night' || state.flags.includes('saw_night_king_power');
    const militaryEndings = [
      {
        id: isLongNight ? 'defeat_military_white_walkers' : 'defeat_military_crush',
        title: isLongNight ? 'Sonsuz Kış ve Ölülerin İstilası' : 'Kırılan Kalkanlar ve Savaş Meydanında Yenilgi',
        subtitle: isLongNight ? 'Duvar Yıkıldı, Karanlık Her Yeri Yuttu' : `${regionMeta.name} Surları Düştü`,
        cause: 'Askerî Güç sıfırlandı: Orduların dağıldı ve savunma hattın tamamen çöktü.',
        story: isLongNight
          ? `Askerî gücün tükendiğinde Night King ve ölüler ordusu ${regionMeta.name} surlarını buz fırtınasıyla aştı. ${titlePrefix} ${state.playerName}, son muhafızlarınla sırt sırta çarpışırken dondurucu karanlık tüm Westeros’un üzerine çöktü.`
          : `${enemyName} komutasındaki ağır süvariler zayıflayan savunma hattını yarıp geçti. ${titlePrefix} ${state.playerName}, ${regionMeta.name} burçlarında sancağın indirilirken savaş meydanında son nefesine kadar çarpışarak düştün.`,
      },
      {
        id: 'defeat_military_dragon_fire',
        title: 'Gökyüzünden Yağan Ateş ve Kan',
        subtitle: 'Savunmasız Kalenin Külleri',
        cause: 'Askerî Güç sıfırlandı: Hava ve kara savunması çöken kalen ejderha ateşine ve kuşatmaya yenik düştü.',
        story: `Ordunun mızrakları ve balistaları tükendiğinde, ${regionMeta.name} semalarında yankılanan kükreme sonun başlangıcı oldu. Surların alevler içinde erirken kalen teslim olmak zorunda kaldı.`,
      },
      {
        id: 'defeat_military_captivity',
        title: 'Demir Zincirler ve Esaret',
        subtitle: 'Garnizonun Teslimiyeti',
        cause: 'Askerî Güç sıfırlandı: Komutanların ve askerlerin savaşacak gücü kalmadı.',
        story: `Yorgun ve sayıca azalmış birliklerin kuşatmayı daha fazla sürdüremedi. ${enemyName} muhafızları taht salonuna girerek seni demir zincirlerle esir aldı; hanedanının kılıcı kırıldı.`,
      },
      {
        id: 'defeat_military_mutiny',
        title: 'Kışlada İsyan ve Terk Edilen Cephe',
        subtitle: 'Kılıçlar Sana Döndü',
        cause: 'Askerî Güç sıfırlandı: Disiplini ve gücü kalmayan ordu dağıldı.',
        story: `${titlePrefix} ${state.playerName}, peş peşe gelen kayıpların ardından kalan son bölükler de sancaklarını bırakıp dağıldı. Savunmasız kalan ${regionMeta.name} tek bir gecede düşmanların eline geçti.`,
      },
    ];
    const picked = militaryEndings[variantIdx];
    return {
      isVictory: false,
      endingId: picked.id,
      title: picked.title,
      subtitle: picked.subtitle,
      storyText: picked.story,
      causeOfEnd: picked.cause,
      triggerIndicator,
      canUpgradeMode: false,
      keyCharacterFates: getTopCharacterFates(state),
    };
  }

  if (triggerIndicator === 'treasury') {
    const treasuryEndings = [
      {
        id: 'defeat_treasury_iron_bank',
        title: 'Demir Bankası’nın Tahsilatı',
        subtitle: 'Braavos Altını Düşmanlarını Satın Aldı',
        cause: 'Hazine sıfırlandı: Braavos Demir Bankası borçlarını tahsil etmek için rakiplerini finanse etti.',
        story: `"Demir Bankası her zaman alacağını tahsil eder." Hazinen kuruduğunda Braavos bankerleri tüm altınlarını ${enemyName} ordularına aktardı. Maaş alamayan paralı askerlerin saf değiştirince ${regionMeta.name} tek bir kurşun atılmadan el değiştirdi.`,
      },
      {
        id: 'defeat_treasury_collapse',
        title: 'Boş Kasalar ve Çöken İmparatorluk',
        subtitle: 'Altınsız Taht Ayakta Kalamaz',
        cause: 'Hazine sıfırlandı: Ekonomik iflas tüm devlet mekanizmasını felç etti.',
        story: `${titlePrefix} ${state.playerName}, hazine mahzenlerinde tek bir bakır sikke bile kalmadı. Ne erzak kervanları yola çıktı ne de muhafızlar nöbet tuttu. Ekonomik çöküş yönetimini içeriden bitirdi.`,
      },
      {
        id: 'defeat_treasury_sellsword_betrayal',
        title: 'Paralı Askerlerin İhaneti',
        subtitle: 'Altın Bittiğinde Sadakat de Biter',
        cause: 'Hazine sıfırlandı: Ücretleri ödenmeyen birlikler kaleyi yağmaladı.',
        story: `Hazine tükendiğinde kaleyi koruyan paralı asker kumpanyaları ücretlerini bizzat sarayını yağmalayarak tahsil etti. ${titlePrefix} ${state.playerName}, dar bir balıkçı teknesiyle Dar Deniz’e sürgüne kaçmak zorunda kaldın.`,
      },
      {
        id: 'defeat_treasury_debt_coup',
        title: 'Tüccar Prenslerin ve Alacaklıların Darbesi',
        subtitle: 'Borç Senetleriyle Devrilen Hükümdar',
        cause: 'Hazine sıfırlandı: Ağır borç krizi siyasi tasfiyeye yol açtı.',
        story: `Alacaklı hanedanlar ve ticaret loncaları birleşerek tüm limanlarına ve kalelerine haciz koydu. ${titlePrefix} ${state.playerName}, servetinle birlikte iktidarını da kaybettin.`,
      },
    ];
    const picked = treasuryEndings[variantIdx];
    return {
      isVictory: false,
      endingId: picked.id,
      title: picked.title,
      subtitle: picked.subtitle,
      storyText: picked.story,
      causeOfEnd: picked.cause,
      triggerIndicator,
      canUpgradeMode: false,
      keyCharacterFates: getTopCharacterFates(state),
    };
  }

  // nobles === 0
  const noblesEndings = [
    {
      id: 'defeat_nobles_assassination',
      title: 'Karanlık Koridorda Hançerler: Saray Darbesi',
      subtitle: 'Soylular Konseyi Seni Ortadan Kaldırdı',
      cause: 'Soyluların ve Siyasi Güçlerin Desteği sıfırlandı: Büyük hanedanlar gizli bir suikast kumpasıyla seni devirdi.',
      story: `${titlePrefix} ${state.playerName}, büyük hanedanların ve saray danışmanlarının desteğini tamamen kaybettin. Gece yarısı Küçük Konsey salonuna çağrıldığında seni bekleyen şey bir toplantı değil, ${enemyName} liderliğindeki komplocuların soğuk hançerleriydi.`,
    },
    {
      id: 'defeat_nobles_civil_war',
      title: 'Sancaktarların İsyanı ve İç Savaş',
      subtitle: 'Yedi Krallık Sana Karşı Birleşti',
      cause: 'Soyluların Desteği sıfırlandı: Tüm büyük hanedanlar sana karşı bayrak açtı.',
      story: `Hiçbir büyük hanedan artık senin mührünü tanımıyor. Kuzey’den Dorne’a kadar tüm lordlar ${enemyName} etrafında koalisyon kurarak ${regionMeta.name} üzerine yürüdü ve tahtını elinden aldı.`,
    },
    {
      id: 'defeat_nobles_poison_feast',
      title: 'Ziyafet Kadehinde Boğucu Zehir',
      subtitle: 'Sessiz Saray İhaneti',
      cause: 'Soyluların Desteği sıfırlandı: Saray elitleri zehirli bir kumpasla iktidarına son verdi.',
      story: `${regionMeta.name} Büyük Salonu’nda şerefine kaldırılan kadehlerin ardında ölümcül bir ihanet gizliydi. Şarabından aldığın ilk yudumda nefesin kesildi; soylular soğuk gözlerle düşüşünü izledi.`,
    },
    {
      id: 'defeat_nobles_night_watch_exile',
      title: 'Tahttan İndirilme ve Siyah Pelerin',
      subtitle: 'Lordlar Meclisi Seni Duvar’a Sürdü',
      cause: 'Soyluların Desteği sıfırlandı: Büyük Konsey oybirliğiyle seni görevden aldı.',
      story: `Büyük hanedanların ortak darbesiyle sarayında kuşatıldın. Hayatının bağışlanması karşılığında tüm unvanlarından feragat ettin ve ömrünün kalanını geçirmek üzere Gece Nöbeti’ne, Duvar’ın soğuğuna gönderildin.`,
    },
  ];
  const picked = noblesEndings[variantIdx];
  return {
    isVictory: false,
    endingId: picked.id,
    title: picked.title,
    subtitle: picked.subtitle,
    storyText: picked.story,
    causeOfEnd: picked.cause,
    triggerIndicator,
    canUpgradeMode: false,
    keyCharacterFates: getTopCharacterFates(state),
  };
}

/**
 * Generates contextual Victory endings when the player reaches the target decision count (300, 600, 1200, or 6000) (Section 11).
 */
export function buildVictoryEnding(state: GameRunState): GameEndSummary {
  const modeMeta = GAME_MODES[state.modeId];
  const roleMeta = PLAYER_ROLES.find((r) => r.id === state.roleId) || PLAYER_ROLES[0];
  const regionMeta = REGIONS[state.currentRegion];
  const ind = state.indicators;

  const romancedChar = Object.values(state.characters).find((c) => c.isRomanced && c.status === 'alive');
  const bestAlly = Object.values(state.characters)
    .filter((c) => c.status === 'alive')
    .sort((a, b) => b.relation - a.relation)[0];
  const allyName = bestAlly ? CHARACTER_MAP[bestAlly.id]?.name : 'Sadık Sancaktarların';

  let title = 'Demir İrade ve Kalıcı Barış: Westeros’un Altın Çağı';
  let subtitle = `${modeMeta.name} (${state.targetDecisions} Karar) Zaferle Tamamlandı`;
  let story = '';

  if (state.flags.includes('night_king_defeated') && state.flags.includes('kings_landing_spared')) {
    title = 'Şafağın ve Barışın Hükümdarı: Yedi Krallık’ın Kurtarıcısı';
    story = `${roleMeta.titlePrefix} ${state.playerName}, hem Uzun Gece’nin karanlığını yendin hem de King’s Landing’i küle dönmekten kurtardın. ${allyName} ile omuz omuza kurduğun yeni düzende Westeros ilk kez adil, güçlü ve müreffeh bir bahara uyanıyor.`;
  } else if (ind.people >= 75 && ind.nobles >= 65) {
    title = 'Halkın Kalkanı ve Büyük Hanedanların Hakemi';
    story = `${roleMeta.titlePrefix} ${state.playerName}, ${state.turn} karar boyunca ne halkı ezdin ne de hanedanların birbirini boğazlamasına izin verdin. ${regionMeta.name} merkezli yönetimin, Flea Bottom’dan Winterfell’e kadar sevgi ve saygıyla selamlanıyor.`;
  } else if (ind.military >= 75) {
    title = 'Çelik ve Ateş İmparatorluğu: Yenilmez Komutan';
    story = `${roleMeta.titlePrefix} ${state.playerName}, kurduğun disiplinli lejyonlar ve sarsılmaz savunma hatları sayesinde hiçbir dış işgalci veya iç isyancı sancağının önünde duramadı. ${allyName} senin zaferlerini tarih kitaplarına altın harflerle yazdırıyor.`;
  } else if (ind.treasury >= 75) {
    title = 'Altın Taht ve Denizlerin Efendisi';
    story = `${roleMeta.titlePrefix} ${state.playerName}, ticaret filoların, dolu kış ambarların ve Braavos’tan Highgarden’a uzanan ekonomik gücünle savaşı kılıçtan önce altın ve akılla kazandın. Diyarda refah hiç bu kadar yükselmemişti.`;
  } else if (state.flags.includes('red_wedding_prevented') || state.flags.includes('ned_stark_saved')) {
    title = 'Kaderi Değiştiren El: Alternatif Westeros Destanı';
    story = `${roleMeta.titlePrefix} ${state.playerName}, tarihin en karanlık ihanetlerini önceden sezerek onurlu kahramanları ölümden kurtardın. Senin liderliğinde Kuzey ve Güney kan davalarını bitirerek ortak bir gelecek kurdu.`;
  } else {
    title = 'Tahtın Gölgesinden Zirveye: Büyük Stratejist';
    story = `${roleMeta.titlePrefix} ${state.playerName}, ${state.turn} zorlu karar boyunca suikastları, kıtlıkları, savaşları ve saray entrikalarını ustalıkla göğüsledin. ${allyName} ve büyük konsey senin liderliğinde yeni çağı selamlıyor.`;
  }

  if (romancedChar) {
    const rDef = CHARACTER_MAP[romancedChar.id];
    if (rDef) {
      story += ` Yanında kalbinin ortağı ${rDef.name} varken, kurduğun hanedan nesiller boyu sürecek.`;
    }
  }

  return {
    isVictory: true,
    endingId: `victory_${state.modeId}_${state.turn}`,
    title,
    subtitle,
    storyText: story,
    causeOfEnd: `${modeMeta.name} hedefi olan ${state.targetDecisions} karar hiçbir gösterge sıfırlanmadan başarıyla tamamlandı!`,
    canUpgradeMode: Boolean(modeMeta.nextModeId),
    nextModeId: modeMeta.nextModeId,
    keyCharacterFates: getTopCharacterFates(state),
  };
}
