// ===== جبهة الكروت: بيانات الكروت =====
// type: INF مشاة | ARM مدرعات | GUN مدفعية
// kw: charge هجوم خاطف, guard متحصّن, ranged بعيد المدى, precision دقيق, antiTank مضاد دروع, antiInf مضاد أفراد, siege حصار
const NATIONS = {
  UK: { n: 'بريطانيا', c: '#7a2b2b' }, FR: { n: 'فرنسا', c: '#2b4a7a' }, DE: { n: 'ألمانيا', c: '#3a3a3a' },
  US: { n: 'أمريكا', c: '#2b5a4a' }, IT: { n: 'إيطاليا', c: '#4a6a2b' }, AU: { n: 'أستراليا', c: '#7a5a2b' },
  OT: { n: 'العثمانيين', c: '#8a3a1a' }, ANY: { n: 'تكتيك', c: '#5a4a2a' }
};

const CARDS = {};
function def(c) { c.kw = c.kw || []; c.armor = c.armor || 0; CARDS[c.id] = c; }

// ---------- المشاة ----------
def({ id: 'rifle', kind: 'troop', type: 'INF', nat: 'UK', rarity: 'common', cost: 1, atk: 2, hp: 2, icon: 'soldier',
  name: 'مشاة بريطانيون', en: 'Lee-Enfield Riflemen', fact: 'بندقية لي-إنفيلد كانت سريعة جدًا؛ الجندي المدرّب كان بيضرب 15 طلقة مصوّبة في الدقيقة.' });
def({ id: 'poilu', kind: 'troop', type: 'INF', nat: 'FR', rarity: 'common', cost: 2, atk: 2, hp: 3, icon: 'soldier',
  name: 'البوالو', en: 'Poilus', fact: '"البوالو" يعني "المُشعِر"، لقب الجندي الفرنسي في الخنادق. صمدوا في فردان 1916.' });
def({ id: 'arditi', kind: 'troop', type: 'INF', nat: 'IT', rarity: 'rare', cost: 2, atk: 3, hp: 1, kw: ['charge'], icon: 'knife',
  name: 'الأرديتي', en: 'Arditi', fact: 'قوات الاقتحام الإيطالية؛ كانوا بيهجموا بالخناجر والقنابل اليدوية.' });
def({ id: 'storm', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'rare', cost: 3, atk: 3, hp: 3, kw: ['charge'], icon: 'knife',
  name: 'قوات الاقتحام', en: 'Stoßtruppen', fact: 'وحدات ألمانية صغيرة اتدربت تتسلل وتعدّي نقط العدو القوية، واستُخدمت بكثافة في هجوم ربيع 1918.' });
def({ id: 'sniper', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'rare', cost: 2, atk: 2, hp: 1, kw: ['ranged', 'precision'], icon: '🎯',
  name: 'قنّاص', en: 'Gewehr 98 Sniper', fact: 'ألمانيا بدأت الحرب بآلاف المناظير التليسكوبية على بنادق Gewehr 98، وكان قناصتها مرعبين في الخنادق.' });
def({ id: 'vickers', kind: 'troop', type: 'INF', nat: 'UK', rarity: 'common', cost: 3, atk: 2, hp: 4, kw: ['guard', 'antiInf'], icon: 'mg',
  name: 'رشاش فيكرز', en: 'Vickers MG', fact: 'رشاش مبرّد بالمية، كان ممكن يضرب ساعات متواصلة من غير ما يسخن.' });
def({ id: 'mg08', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'rare', cost: 4, atk: 3, hp: 5, kw: ['guard', 'antiInf'], icon: 'mg',
  name: 'رشاش MG 08', en: 'Maxim MG 08', fact: 'الرشاش الألماني اللي سبّب أغلب خسائر الحلفاء في أول يوم في معركة السوم 1916.' });
def({ id: 'lewis', kind: 'troop', type: 'INF', nat: 'UK', rarity: 'common', cost: 2, atk: 2, hp: 2, kw: ['antiInf'], icon: 'mg',
  name: 'رشاش لويس', en: 'Lewis Gun', fact: 'رشاش خفيف بيشيله فرد واحد، بخزنة دائرية فيها 47 طلقة.' });
def({ id: 'atrifle', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'common', cost: 2, atk: 2, hp: 3, kw: ['antiTank'], icon: 'atrifle',
  name: 'بندقية مضادة للدبابات', en: 'Mauser T-Gewehr', fact: 'أول بندقية مضادة للدبابات في التاريخ (1918)، عيارها حوالي 13 مم، وارتدادها كان عنيف جدًا.' });
def({ id: 'bundle', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'common', cost: 3, atk: 3, hp: 3, kw: ['antiTank'], icon: '💣',
  name: 'فرقة الشحنة المجمّعة', en: 'Geballte Ladung', fact: 'قبل اختراع الـRPG بسنين: كانوا بيربطوا رؤوس 6 قنابل يدوية حوالين قنبلة واحدة ويرموها تحت الدبابة.' });
def({ id: 'flame', kind: 'troop', type: 'INF', nat: 'DE', rarity: 'epic', cost: 4, atk: 3, hp: 3, kw: ['antiInf'], deploy: 'burn', icon: '🔥',
  name: 'قاذف اللهب', en: 'Flammenwerfer M.16', fact: 'ألمانيا استخدمت قاذف اللهب لأول مرة ضد الفرنسيين سنة 1915.' });
def({ id: 'cav', kind: 'troop', type: 'INF', nat: 'AU', rarity: 'common', cost: 3, atk: 3, hp: 2, kw: ['charge'], icon: '🐎',
  name: 'الخيالة الأسترالية', en: 'Light Horse', fact: 'في بئر السبع 1917 الخيالة الأسترالية عملت واحدة من آخر هجمات الخيالة الناجحة في التاريخ.' });
def({ id: 'dough', kind: 'troop', type: 'INF', nat: 'US', rarity: 'common', cost: 4, atk: 4, hp: 5, icon: 'soldier',
  name: 'الدوبويز', en: 'Doughboys', fact: 'لقب الجنود الأمريكان؛ وصلوا فرنسا بالملايين في 1918 وقلبوا ميزان الحرب.' });
def({ id: 'medic', kind: 'troop', type: 'INF', nat: 'UK', rarity: 'common', cost: 2, atk: 1, hp: 4, deploy: 'heal', icon: '⛑️',
  name: 'مسعف ميداني', en: 'Stretcher Bearers', fact: 'حاملين النقالات كانوا بيشيلوا الجرحى تحت النار من "الأرض الحرام" بين الخنادق.' });
def({ id: 'ottoman', kind: 'troop', type: 'INF', nat: 'OT', rarity: 'common', cost: 3, atk: 2, hp: 5, kw: ['guard'], icon: 'soldier',
  name: 'مشاة عثمانيون', en: 'Ottoman Infantry', fact: 'صمدوا في خنادق جاليبولي 1915 وأفشلوا إنزال الحلفاء.' });

// ---------- المدرعات ----------
def({ id: 'car', kind: 'troop', type: 'ARM', nat: 'UK', rarity: 'common', cost: 2, atk: 2, hp: 2, armor: 1, kw: ['charge'], icon: 'car',
  name: 'مدرعة رولز رويس', en: 'Rolls-Royce Armoured Car', fact: 'لورنس العرب استخدمها في صحراء الحجاز.' });
def({ id: 'ft', kind: 'troop', type: 'ARM', nat: 'FR', rarity: 'common', cost: 3, atk: 2, hp: 5, armor: 1, icon: 'light',
  name: 'رينو FT', en: 'Renault FT', fact: 'أول دبابة ببرج بيلف 360 درجة؛ تصميمها بقى أساس كل الدبابات اللي بعدها.' });
def({ id: 'whippet', kind: 'troop', type: 'ARM', nat: 'UK', rarity: 'rare', cost: 4, atk: 3, hp: 4, armor: 1, kw: ['charge'], icon: 'light',
  name: 'دبابة ويبت', en: 'Medium Mark A Whippet', fact: 'دبابة "سريعة" بـ4 رشاشات، كانت بتجري حوالي 13 كم/ساعة.' });
def({ id: 'mk4f', kind: 'troop', type: 'ARM', nat: 'UK', rarity: 'rare', cost: 4, atk: 3, hp: 6, armor: 1, kw: ['antiInf'], icon: 'tank',
  name: 'مارك 4 "أنثى"', en: 'Mark IV Female', fact: 'النسخة "الأنثى" كانت مسلحة برشاشات بس، مخصوصة لحصد المشاة.' });
def({ id: 'mk4m', kind: 'troop', type: 'ARM', nat: 'UK', rarity: 'epic', cost: 5, atk: 3, hp: 6, armor: 2, kw: ['antiTank'], icon: 'tank',
  name: 'مارك 4 "ذكر"', en: 'Mark IV Male', fact: 'النسخة "الذكر" فيها مدفعين 6 رطل (57 مم)، وهي اللي حاربت في أول معركة دبابة ضد دبابة 1918.' });
def({ id: 'ca1', kind: 'troop', type: 'ARM', nat: 'FR', rarity: 'rare', cost: 5, atk: 4, hp: 6, armor: 1, icon: 'tank',
  name: 'شنايدر CA1', en: 'Schneider CA1', fact: 'أول دبابة فرنسية، بمدفع 75 مم قصير ورشاشين.' });
def({ id: 'stchamond', kind: 'troop', type: 'ARM', nat: 'FR', rarity: 'epic', cost: 6, atk: 5, hp: 7, armor: 1, kw: ['antiTank'], icon: 'tank',
  name: 'سان شاموند', en: 'Saint-Chamond', fact: 'دبابة طويلة جدًا بمدفع ميداني 75 مم كامل في مقدمتها.' });
def({ id: 'a7v', kind: 'troop', type: 'ARM', nat: 'DE', rarity: 'legendary', cost: 7, atk: 5, hp: 9, armor: 2, kw: ['antiInf'], icon: 'tank',
  name: 'A7V العملاقة', en: 'A7V Sturmpanzerwagen', fact: 'الدبابة الألمانية الوحيدة اللي دخلت الخدمة؛ اتعمل منها حوالي 20 بس، بطاقم 18 فرد ومدفع 57 مم و6 رشاشات.' });

// ---------- المدفعية ----------
def({ id: 'stokes', kind: 'troop', type: 'GUN', nat: 'UK', rarity: 'common', cost: 2, atk: 2, hp: 2, kw: ['ranged'], icon: 'mortar',
  name: 'هاون ستوكس', en: 'Stokes Mortar', fact: 'هاون خفيف بيضرب من جوه الخندق لخندق العدو مباشرة.' });
def({ id: 'fk77', kind: 'troop', type: 'GUN', nat: 'DE', rarity: 'common', cost: 3, atk: 2, hp: 3, kw: ['ranged', 'antiTank'], icon: 'gun',
  name: 'مدفع ميدان 77 مم', en: '7.7 cm FK 96', fact: 'المدفع الميداني بالضرب المباشر كان أهم سلاح ألماني ضد الدبابات.' });
def({ id: 'f75', kind: 'troop', type: 'GUN', nat: 'FR', rarity: 'rare', cost: 4, atk: 3, hp: 4, kw: ['ranged', 'precision'], icon: 'gun',
  name: 'مدفع الـ75 الفرنسي', en: 'Canon de 75', fact: 'أول مدفع حديث بنظام امتصاص ارتداد، كان بيضرب 15 قذيفة في الدقيقة.' });
def({ id: 'howitzer', kind: 'troop', type: 'GUN', nat: 'UK', rarity: 'epic', cost: 5, atk: 4, hp: 4, kw: ['ranged', 'siege'], icon: 'gun',
  name: 'هاوتزر 6 بوصة', en: 'BL 6-inch Howitzer', fact: 'مدفع ثقيل لتدمير الخنادق والتحصينات.' });
def({ id: 'bertha', kind: 'troop', type: 'GUN', nat: 'DE', rarity: 'legendary', cost: 8, atk: 5, hp: 6, kw: ['ranged', 'precision', 'siege'], icon: 'gun',
  name: 'بيج بيرثا', en: 'Big Bertha 42 cm', fact: 'هاوتزر عيار 420 مم دمّر حصون لييج البلجيكية سنة 1914. القذيفة الواحدة حوالي 800 كجم.' });

// ---------- كروت الوحدات المستدعاة (مش بتتجمع) ----------
def({ id: 'tk_para', kind: 'troop', type: 'INF', nat: 'US', rarity: 'common', cost: 0, atk: 2, hp: 1, kw: ['charge'], icon: '🪂', token: true,
  name: 'مظلّي', en: 'Paratrooper' });
def({ id: 'tk_fort', kind: 'troop', type: 'GUN', nat: 'ANY', rarity: 'common', cost: 0, atk: 2, hp: 5, kw: ['ranged', 'guard'], icon: 'gun', token: true,
  name: 'مدفع محصّن', en: 'Fortress Gun' });

def({ id: 'tk_coin', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 0, tgt: 'none', icon: '⛽', token: true,
  name: 'إمداد احتياطي', en: 'Reserve Supply', text: '+1 إمداد في الدور ده بس. (بياخده اللي بيلعب تاني)' });

// ---------- التكتيكات ----------
// tgt: none | enemy (وحدة أو قيادة) | enemyUnit | friendUnit | slot (خانة فاضية عندك)
def({ id: 'x_para', kind: 'tactic', nat: 'ANY', rarity: 'rare', cost: 3, tgt: 'none', icon: '🪂',
  name: 'إنزال مظلّيين', en: 'Paratroopers', text: 'انزل مظلّيين اتنين (ضرر 2 / صحة 1) بهجوم خاطف في خانات فاضية.',
  fact: 'في أكتوبر 1918 بيلي ميتشل اقترح إنزال الفرقة الأمريكية الأولى بالمظلات ورا خطوط الألمان في ميتز. الحرب خلصت قبل التنفيذ.' });
def({ id: 'x_barrage', kind: 'tactic', nat: 'ANY', rarity: 'rare', cost: 4, tgt: 'none', icon: '💥',
  name: 'قصف مدفعي بعيد', en: 'Long-Range Barrage', text: '2 ضرر لكل وحدات العدو (الدرع بيقلّله).',
  fact: 'قبل هجوم السوم 1916 البريطانيين ضربوا أكتر من مليون ونص قذيفة في أسبوع.' });
def({ id: 'x_bomber', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 3, tgt: 'enemy', icon: '✈️',
  name: 'غارة قاذفة جوتا', en: 'Gotha Bombing Raid', text: '4 ضرر لوحدة عدو (بيتجاهل الدرع والتحصين) أو 3 ضرر لقيادة العدو.',
  fact: 'قاذفات جوتا G.IV الألمانية ضربت لندن بالقنابل في وضح النهار سنة 1917.' });
def({ id: 'x_mine', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 2, tgt: 'none', icon: '⚠️',
  name: 'حقل ألغام', en: 'Minefield', text: 'فخ مخفي: أول وحدة ينزّلها العدو بعد كده تاخد 4 ضرر (بيتجاهل الدرع).',
  fact: 'الألمان زرعوا ألغام مضادة للدبابات من قذائف مدفعية مدفونة سنة 1918.' });
def({ id: 'x_trench', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 1, tgt: 'friendUnit', icon: '⛏️',
  name: 'حفر خنادق', en: 'Dig In', text: 'وحدة صاحبة بتاخد +2 صحة وبتبقى متحصّنة.',
  fact: 'خطوط الخنادق على الجبهة الغربية امتدت حوالي 700 كم من بحر الشمال لسويسرا.' });
def({ id: 'x_fort', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 3, tgt: 'slot', icon: '🏰',
  name: 'مدفع محصّن', en: 'Fortified Gun', text: 'ابني مدفع محصّن (ضرر 2 / صحة 5) بعيد المدى ومتحصّن في خانة فاضية.',
  fact: 'حصون فردان زي دوومون كان فيها مدافع في أبراج خرسانية ومصفحة.' });
def({ id: 'x_gas', kind: 'tactic', nat: 'ANY', rarity: 'rare', cost: 2, tgt: 'none', icon: '☠️',
  name: 'هجوم بالغاز', en: 'Gas Attack', text: '2 ضرر لكل مشاة العدو (الدبابات والمدافع مش بتتأثر).',
  fact: 'أول هجوم كبير بغاز الكلور كان في إيبر في أبريل 1915.' });
def({ id: 'x_recon', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 2, tgt: 'none', icon: '🔭',
  name: 'طيارة استطلاع', en: 'Recon Flight', text: 'اسحب كارتين.',
  fact: 'أول دور حربي للطيارات في الحرب كان الاستطلاع وتصوير خنادق العدو.' });
def({ id: 'x_ace', kind: 'tactic', nat: 'ANY', rarity: 'epic', cost: 3, tgt: 'enemyUnit', icon: '🛩️',
  name: 'الطيار الآس', en: 'Flying Ace', text: '3 ضرر لوحدة عدو (بيتجاهل الدرع) واسحب كارت.',
  fact: 'البارون الأحمر مانفريد فون ريشتهوفن سجّل 80 انتصار جوي، أشهرها بطيارته الحمرا Fokker Dr.I.' });
def({ id: 'x_wire', kind: 'tactic', nat: 'ANY', rarity: 'rare', cost: 1, tgt: 'none', icon: '🕸️',
  name: 'أسلاك شائكة', en: 'Barbed Wire', text: 'مشاة العدو مش هيقدروا يهاجموا في دورهم الجاي.',
  fact: 'الأسلاك الشائكة قدام الخنادق كانت بتوقف الهجوم وتخلي المهاجمين هدف سهل للرشاشات.' });
def({ id: 'x_convoy', kind: 'tactic', nat: 'ANY', rarity: 'rare', cost: 1, tgt: 'none', icon: '🚚',
  name: 'قافلة إمدادات', en: 'Supply Convoy', text: 'ادفع 1 وخد +3 إمداد في الدور ده بس.',
  fact: '"الطريق المقدّس" لفردان: آلاف العربيات كانت بتعدّي عليه كل يوم بالإمدادات.' });
def({ id: 'x_hospital', kind: 'tactic', nat: 'ANY', rarity: 'common', cost: 2, tgt: 'none', icon: '🏥',
  name: 'مستشفى ميداني', en: 'Field Hospital', text: 'عالج قيادتك 5 وكل وحداتك 2.',
  fact: 'محطات إخلاء الجرحى كانت على بُعد كيلومترات قليلة من خط النار.' });

const STARTER_DECK = ['rifle', 'rifle', 'poilu', 'poilu', 'vickers', 'atrifle', 'atrifle', 'lewis', 'medic', 'cav', 'dough', 'ft', 'car', 'stokes', 'fk77',
  'x_bomber', 'x_mine', 'x_trench', 'x_recon', 'x_hospital'];
const DECK_TROOPS = 15, DECK_TACTICS = 5;
function maxCopies(id) { return CARDS[id].rarity === 'legendary' ? 1 : 2; }

const KW_TEXT = {
  charge: ['⚡', 'هجوم خاطف', 'يقدر يهاجم في نفس الدور اللي نزل فيه.'],
  guard: ['🧱', 'متحصّن', 'العدو لازم يهاجمه الأول قبل أي وحدة تانية أو القيادة.'],
  ranged: ['🎯', 'بعيد المدى', 'لما يهاجم مايتعرضش لضربة الرد.'],
  precision: ['🔍', 'دقيق', 'يتخطّى المتحصّنين ويختار أي هدف حتى القيادة.'],
  antiTank: ['🧨', 'مضاد دروع', 'ضرره ×2 ضد الدبابات وبيتجاهل الدرع.'],
  antiInf: ['💢', 'مضاد أفراد', 'ضرره ×2 ضد المشاة.'],
  siege: ['🏚️', 'حصار', 'ضرره ×2 على قيادة العدو.'],
};
const DEPLOY_TEXT = { heal: 'لما ينزل: يعالج كل وحداتك وقيادتك 2.', burn: 'لما ينزل: 1 ضرر لكل مشاة العدو.' };
const TYPE_TEXT = { INF: 'مشاة', ARM: 'مدرّعة', GUN: 'مدفعية' };
const RARITY_TEXT = { common: 'عادي', rare: 'نادر', epic: 'ملحمي', legendary: 'أسطوري' };
