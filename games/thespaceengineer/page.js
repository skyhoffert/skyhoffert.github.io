// PACK.SH : Mon 25 Oct 2021 11:19:58 PM EDT
////////////////////////////////////////////////////////////////////////////////
// const.js: Constant values.

// const WIDTH = Math.floor(window.innerWidth*7/8);
const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const GAME_WIDTH_FULL = 1000;
const GAME_HEIGHT_FULL = 600;
const GAME_SCALE = WIDTH/GAME_WIDTH_FULL < HEIGHT/GAME_HEIGHT_FULL ?
    WIDTH/GAME_WIDTH_FULL : HEIGHT/GAME_HEIGHT_FULL;
const GAME_WIDTH = GAME_WIDTH_FULL * GAME_SCALE;
const GAME_HEIGHT = GAME_HEIGHT_FULL * GAME_SCALE;
const GAME_LEFT = WIDTH/2 - GAME_WIDTH/2;
const GAME_TOP = HEIGHT/2 - GAME_HEIGHT/2;

const LOG_LEVELS = {TRACE:5, DEBUG:4, INFO:3, WARN:2, ERROR:1, FATAL:0};
const LOG_LEVEL = LOG_LEVELS.TRACE;

const COLLISION_CATEGORY = {WALL:0, BUTTON: 1};

const PI = 3.1415926;

const KEYS_INIT = {
    "ArrowDown": {down:false, down_time:0},
    "ArrowUp": {down:false, down_time:0},
    "ArrowLeft": {down:false, down_time:0},
    "ArrowRight": {down:false, down_time:0},
    "Enter": {down:false, down_time:0},
    "Space": {down:false, down_time:0},
    "ControlLeft": {down:false, down_time:0},
    "ControlRight": {down:false, down_time:0},
    "ShiftLeft": {down:false, down_time:0},
    "ShiftRight": {down:false, down_time:0},
    "KeyA": {down:false, down_time:0},
    "KeyS": {down:false, down_time:0},
    "KeyD": {down:false, down_time:0},
    "KeyW": {down:false, down_time:0},
    "KeyQ": {down:false, down_time:0},
    "KeyR": {down:false, down_time:0},
    "Escape": {down:false, down_time:0},
};

const FIRST_NAMES = ["abandoned","able","absolute","adorable","adventurous","academic","acceptable","acclaimed","accomplished","accurate","aching","acidic","acrobatic","active","actual","adept","admirable","admired","adolescent","adorable","adored","advanced","afraid","affectionate","aged","aggravating","aggressive","agile","agitated","agonizing","agreeable","ajar","alarmed","alarming","alert","alienated","alive","all","altruistic","amazing","ambitious","ample","amused","amusing","anchored","ancient","angelic","angry","anguished","animated","annual","another","antique","anxious","any","apprehensive","appropriate","apt","arctic","arid","aromatic","artistic","ashamed","assured","astonishing","athletic","attached","attentive","attractive","austere","authentic","authorized","automatic","avaricious","average","aware","awesome","awful","awkward","babyish","bad","back","baggy","bare","barren","basic","beautiful","belated","beloved","beneficial","better","best","bewitched","big","big-hearted","biodegradable","bite-sized","bitter","black","black-and-white","bland","blank","blaring","bleak","blind","blissful","blond","blue","blushing","bogus","boiling","bold","bony","boring","bossy","both","bouncy","bountiful","bowed","brave","breakable","brief","bright","brilliant","brisk","broken","bronze","brown","bruised","bubbly","bulky","bumpy","buoyant","burdensome","burly","bustling","busy","buttery","buzzing","calculating","calm","candid","canine","capital","carefree","careful","careless","caring","cautious","cavernous","celebrated","charming","cheap","cheerful","cheery","chief","chilly","chubby","circular","classic","clean","clear","clear-cut","clever","close","closed","cloudy","clueless","clumsy","cluttered","coarse","cold","colorful","colorless","colossal","comfortable","common","compassionate","competent","complete","complex","complicated","composed","concerned","concrete","confused","conscious","considerate","constant","content","conventional","cooked","cool","cooperative","coordinated","corny","corrupt","costly","courageous","courteous","crafty","crazy","creamy","creative","creepy","criminal","crisp","critical","crooked","crowded","cruel","crushing","cuddly","cultivated","cultured","cumbersome","curly","curvy","cute","cylindrical","damaged","damp","dangerous","dapper","daring","darling","dark","dazzling","dead","deadly","deafening","dear","dearest","decent","decimal","decisive","deep","defenseless","defensive","defiant","deficient","definite","definitive","delayed","delectable","delicious","delightful","delirious","demanding","dense","dental","dependable","dependent","descriptive","deserted","detailed","determined","devoted","different","difficult","digital","diligent","dim","dimpled","dimwitted","direct","disastrous","discrete","disfigured","disgusting","disloyal","dismal","distant","downright","dreary","dirty","disguised","dishonest","dismal","distant","distinct","distorted","dizzy","dopey","doting","double","downright","drab","drafty","dramatic","dreary","droopy","dry","dual","dull","dutiful","each","eager","earnest","early","easy","easy-going","ecstatic","edible","educated","elaborate","elastic","elated","elderly","electric","elegant","elementary","elliptical","embarrassed","embellished","eminent","emotional","empty","enchanted","enchanting","energetic","enlightened","enormous","enraged","entire","envious","equal","equatorial","essential","esteemed","ethical","euphoric","even","evergreen","everlasting","every","evil","exalted","excellent","exemplary","exhausted","excitable","excited","exciting","exotic","expensive","experienced","expert","extraneous","extroverted","extra-large","extra-small","fabulous","failing","faint","fair","faithful","fake","false","familiar","famous","fancy","fantastic","far","faraway","far-flung","far-off","fast","fat","fatal","fatherly","favorable","favorite","fearful","fearless","feisty","feline","female","feminine","few","fickle","filthy","fine","finished","firm","first","firsthand","fitting","fixed","flaky","flamboyant","flashy","flat","flawed","flawless","flickering","flimsy","flippant","flowery","fluffy","fluid","flustered","focused","fond","foolhardy","foolish","forceful","forked","formal","forsaken","forthright","fortunate","fragrant","frail","frank","frayed","free","French","fresh","frequent","friendly","frightened","frightening","frigid","frilly","frizzy","frivolous","front","frosty","frozen","frugal","fruitful","full","fumbling","functional","funny","fussy","fuzzy","gargantuan","gaseous","general","generous","gentle","genuine","giant","giddy","gigantic","gifted","giving","glamorous","glaring","glass","gleaming","gleeful","glistening","glittering","gloomy","glorious","glossy","glum","golden","good","good-natured","gorgeous","graceful","gracious","grand","grandiose","granular","grateful","grave","gray","great","greedy","green","gregarious","grim","grimy","gripping","grizzled","gross","grotesque","grouchy","grounded","growing","growling","grown","grubby","gruesome","grumpy","guilty","gullible","gummy","hairy","half","handmade","handsome","handy","happy","happy-go-lucky","hard","hard-to-find","harmful","harmless","harmonious","harsh","hasty","hateful","haunting","healthy","heartfelt","hearty","heavenly","heavy","hefty","helpful","helpless","hidden","hideous","high","high-level","hilarious","hoarse","hollow","homely","honest","honorable","honored","hopeful","horrible","hospitable","hot","huge","humble","humiliating","humming","humongous","hungry","hurtful","husky","icky","icy","ideal","idealistic","identical","idle","idiotic","idolized","ignorant","ill","illegal","ill-fated","ill-informed","illiterate","illustrious","imaginary","imaginative","immaculate","immaterial","immediate","immense","impassioned","impeccable","impartial","imperfect","imperturbable","impish","impolite","important","impossible","impractical","impressionable","impressive","improbable","impure","inborn","incomparable","incompatible","incomplete","inconsequential","incredible","indelible","inexperienced","indolent","infamous","infantile","infatuated","inferior","infinite","informal","innocent","insecure","insidious","insignificant","insistent","instructive","insubstantial","intelligent","intent","intentional","interesting","internal","international","intrepid","ironclad","irresponsible","irritating","itchy","jaded","jagged","jam-packed","jaunty","jealous","jittery","joint","jolly","jovial","joyful","joyous","jubilant","judicious","juicy","jumbo","junior","jumpy","juvenile","kaleidoscopic","keen","key","kind","kindhearted","kindly","klutzy","knobby","knotty","knowledgeable","knowing","known","kooky","kosher","lame","lanky","large","last","lasting","late","lavish","lawful","lazy","leading","lean","leafy","left","legal","legitimate","light","lighthearted","likable","likely","limited","limp","limping","linear","lined","liquid","little","live","lively","livid","loathsome","lone","lonely","long","long-term","loose","lopsided","lost","loud","lovable","lovely","loving","low","loyal","lucky","lumbering","luminous","lumpy","lustrous","luxurious","mad","made-up","magnificent","majestic","major","male","mammoth","married","marvelous","masculine","massive","mature","meager","mealy","mean","measly","meaty","medical","mediocre","medium","meek","mellow","melodic","memorable","menacing","merry","messy","metallic","mild","milky","mindless","miniature","minor","minty","miserable","miserly","misguided","misty","mixed","modern","modest","moist","monstrous","monthly","monumental","moral","mortified","motherly","motionless","mountainous","muddy","muffled","multicolored","mundane","murky","mushy","musty","muted","mysterious","naive","narrow","nasty","natural","naughty","nautical","near","neat","necessary","needy","negative","neglected","negligible","neighboring","nervous","new","next","nice","nifty","nimble","nippy","nocturnal","noisy","nonstop","normal","notable","noted","noteworthy","novel","noxious","numb","nutritious","nutty","obedient","obese","oblong","oily","oblong","obvious","occasional","odd","oddball","offbeat","offensive","official","old","old-fashioned","only","open","optimal","optimistic","opulent","orange","orderly","organic","ornate","ornery","ordinary","original","other","our","outlying","outgoing","outlandish","outrageous","outstanding","oval","overcooked","overdue","overjoyed","overlooked","palatable","pale","paltry","parallel","parched","partial","passionate","past","pastel","peaceful","peppery","perfect","perfumed","periodic","perky","personal","pertinent","pesky","pessimistic","petty","phony","physical","piercing","pink","pitiful","plain","plaintive","plastic","playful","pleasant","pleased","pleasing","plump","plush","polished","polite","political","pointed","pointless","poised","poor","popular","portly","posh","positive","possible","potable","powerful","powerless","practical","precious","present","prestigious","pretty","precious","previous","pricey","prickly","primary","prime","pristine","private","prize","probable","productive","profitable","profuse","proper","proud","prudent","punctual","pungent","puny","pure","purple","pushy","putrid","puzzled","puzzling","quaint","qualified","quarrelsome","quarterly","queasy","querulous","questionable","quick","quick-witted","quiet","quintessential","quirky","quixotic","quizzical","radiant","ragged","rapid","rare","rash","raw","recent","reckless","rectangular","ready","real","realistic","reasonable","red","reflecting","regal","regular","reliable","relieved","remarkable","remorseful","remote","repentant","required","respectful","responsible","repulsive","revolving","rewarding","rich","rigid","right","ringed","ripe","roasted","robust","rosy","rotating","rotten","rough","round","rowdy","royal","rubbery","rundown","ruddy","rude","runny","rural","rusty","sad","safe","salty","same","sandy","sane","sarcastic","sardonic","satisfied","scaly","scarce","scared","scary","scented","scholarly","scientific","scornful","scratchy","scrawny","second","secondary","second-hand","secret","self-assured","self-reliant","selfish","sentimental","separate","serene","serious","serpentine","several","severe","shabby","shadowy","shady","shallow","shameful","shameless","sharp","shimmering","shiny","shocked","shocking","shoddy","short","short-term","showy","shrill","shy","sick","silent","silky","silly","silver","similar","simple","simplistic","sinful","single","sizzling","skeletal","skinny","sleepy","slight","slim","slimy","slippery","slow","slushy","small","smart","smoggy","smooth","smug","snappy","snarling","sneaky","sniveling","snoopy","sociable","soft","soggy","solid","somber","some","spherical","sophisticated","sore","sorrowful","soulful","soupy","sour","Spanish","sparkling","sparse","specific","spectacular","speedy","spicy","spiffy","spirited","spiteful","splendid","spotless","spotted","spry","square","squeaky","squiggly","stable","staid","stained","stale","standard","starchy","stark","starry","steep","sticky","stiff","stimulating","stingy","stormy","straight","strange","steel","strict","strident","striking","striped","strong","studious","stunning","stupendous","stupid","sturdy","stylish","subdued","submissive","substantial","subtle","suburban","sudden","sugary","sunny","super","superb","superficial","superior","supportive","sure-footed","surprised","suspicious","svelte","sweaty","sweet","sweltering","swift","sympathetic","tall","talkative","tame","tan","tangible","tart","tasty","tattered","taut","tedious","teeming","tempting","tender","tense","tepid","terrible","terrific","testy","thankful","that","these","thick","thin","third","thirsty","this","thorough","thorny","those","thoughtful","threadbare","thrifty","thunderous","tidy","tight","timely","tinted","tiny","tired","torn","total","tough","traumatic","treasured","tremendous","tragic","trained","tremendous","triangular","tricky","trifling","trim","trivial","troubled","true","trusting","trustworthy","trusty","truthful","tubby","turbulent","twin","ugly","ultimate","unacceptable","unaware","uncomfortable","uncommon","unconscious","understated","unequaled","uneven","unfinished","unfit","unfolded","unfortunate","unhappy","unhealthy","uniform","unimportant","unique","united","unkempt","unknown","unlawful","unlined","unlucky","unnatural","unpleasant","unrealistic","unripe","unruly","unselfish","unsightly","unsteady","unsung","untidy","untimely","untried","untrue","unused","unusual","unwelcome","unwieldy","unwilling","unwitting","unwritten","upbeat","upright","upset","urban","usable","used","useful","useless","utilized","utter","vacant","vague","vain","valid","valuable","vapid","variable","vast","velvety","venerated","vengeful","verifiable","vibrant","vicious","victorious","vigilant","vigorous","villainous","violet","violent","virtual","virtuous","visible","vital","vivacious","vivid","voluminous","wan","warlike","warm","warmhearted","warped","wary","wasteful","watchful","waterlogged","watery","wavy","wealthy","weak","weary","webbed","wee","weekly","weepy","weighty","weird","welcome","well-documented","well-groomed","well-informed","well-lit","well-made","well-off","well-to-do","well-worn","wet","which","whimsical","whirlwind","whispered","white","whole","whopping","wicked","wide","wide-eyed","wiggly","wild","willing","wilted","winding","windy","winged","wiry","wise","witty","wobbly","woeful","wonderful","wooden","woozy","wordy","worldly","worn","worried","worrisome","worse","worst","worthless","worthwhile","worthy","wrathful","wretched","writhing","wrong","wry","yawning","yearly","yellow","yellowish","young","youthful","yummy","zany","zealous","zesty","zigzag","rocky"];
const LAST_NAMES = ["people","history","way","art","world","information","map","family","government","health","system","computer","meat","year","thanks","music","person","reading","method","data","food","understanding","theory","law","bird","literature","problem","software","control","knowledge","power","ability","economics","love","internet","television","science","library","nature","fact","product","idea","temperature","investment","area","society","activity","story","industry","media","thing","oven","community","definition","safety","quality","development","language","management","player","variety","video","week","security","country","exam","movie","organization","equipment","physics","analysis","policy","series","thought","basis","boyfriend","direction","strategy","technology","army","camera","freedom","paper","environment","child","instance","month","truth","marketing","university","writing","article","department","difference","goal","news","audience","fishing","growth","income","marriage","user","combination","failure","meaning","medicine","philosophy","teacher","communication","night","chemistry","disease","disk","energy","nation","road","role","soup","advertising","location","success","addition","apartment","education","math","moment","painting","politics","attention","decision","event","property","shopping","student","wood","competition","distribution","entertainment","office","population","president","unit","category","cigarette","context","introduction","opportunity","performance","driver","flight","length","magazine","newspaper","relationship","teaching","cell","dealer","debate","finding","lake","member","message","phone","scene","appearance","association","concept","customer","death","discussion","housing","inflation","insurance","mood","woman","advice","blood","effort","expression","importance","opinion","payment","reality","responsibility","situation","skill","statement","wealth","application","city","county","depth","estate","foundation","grandmother","heart","perspective","photo","recipe","studio","topic","collection","depression","imagination","passion","percentage","resource","setting","ad","agency","college","connection","criticism","debt","description","memory","patience","secretary","solution","administration","aspect","attitude","director","personality","psychology","recommendation","response","selection","storage","version","alcohol","argument","complaint","contract","emphasis","highway","loss","membership","possession","preparation","steak","union","agreement","cancer","currency","employment","engineering","entry","interaction","limit","mixture","preference","region","republic","seat","tradition","virus","actor","classroom","delivery","device","difficulty","drama","election","engine","football","guidance","hotel","match","owner","priority","protection","suggestion","tension","variation","anxiety","atmosphere","awareness","bread","climate","comparison","confusion","construction","elevator","emotion","employee","employer","guest","height","leadership","mall","manager","operation","recording","respect","sample","transportation","boring","charity","cousin","disaster","editor","efficiency","excitement","extent","feedback","guitar","homework","leader","mom","outcome","permission","presentation","promotion","reflection","refrigerator","resolution","revenue","session","singer","tennis","basket","bonus","cabinet","childhood","church","clothes","coffee","dinner","drawing","hair","hearing","initiative","judgment","lab","measurement","mode","mud","orange","poetry","police","possibility","procedure","queen","ratio","relation","restaurant","satisfaction","sector","signature","significance","song","tooth","town","vehicle","volume","wife","accident","airport","appointment","arrival","assumption","baseball","chapter","committee","conversation","database","enthusiasm","error","explanation","farmer","gate","girl","hall","historian","hospital","injury","instruction","maintenance","manufacturer","meal","perception","pie","poem","presence","proposal","reception","replacement","revolution","river","son","speech","tea","village","warning","winner","worker","writer","assistance","breath","buyer","chest","chocolate","conclusion","contribution","cookie","courage","desk","drawer","establishment","examination","garbage","grocery","honey","impression","improvement","independence","insect","inspection","inspector","king","ladder","menu","penalty","piano","potato","profession","professor","quantity","reaction","requirement","salad","sister","supermarket","tongue","weakness","wedding","affair","ambition","analyst","apple","assignment","assistant","bathroom","bedroom","beer","birthday","celebration","championship","cheek","client","consequence","departure","diamond","dirt","ear","fortune","friendship","funeral","gene","girlfriend","hat","indication","intention","lady","midnight","negotiation","obligation","passenger","pizza","platform","poet","pollution","recognition","reputation","shirt","speaker","stranger","surgery","sympathy","tale","throat","trainer","uncle","youth","time","work","film","water","money","example","while","business","study","game","life","form","air","day","place","number","part","field","fish","back","process","heat","hand","experience","job","book","end","point","type","home","economy","value","body","market","guide","interest","state","radio","course","company","price","size","card","list","mind","trade","line","care","group","risk","word","fat","force","key","light","training","name","school","top","amount","level","order","practice","research","sense","service","piece","web","boss","sport","fun","house","page","term","test","answer","sound","focus","matter","kind","soil","board","oil","picture","access","garden","range","rate","reason","future","site","demand","exercise","image","case","cause","coast","action","age","bad","boat","record","result","section","building","mouse","cash","class","period","plan","store","tax","side","subject","space","rule","stock","weather","chance","figure","man","model","source","beginning","earth","program","chicken","design","feature","head","material","purpose","question","rock","salt","act","birth","car","dog","object","scale","sun","note","profit","rent","speed","style","war","bank","craft","half","inside","outside","standard","bus","exchange","eye","fire","position","pressure","stress","advantage","benefit","box","frame","issue","step","cycle","face","item","metal","paint","review","room","screen","structure","view","account","ball","discipline","medium","share","balance","bit","black","bottom","choice","gift","impact","machine","shape","tool","wind","address","average","career","culture","morning","pot","sign","table","task","condition","contact","credit","egg","hope","ice","network","north","square","attempt","date","effect","link","post","star","voice","capital","challenge","friend","self","shot","brush","couple","exit","front","function","lack","living","plant","plastic","spot","summer","taste","theme","track","wing","brain","button","click","desire","foot","gas","influence","notice","rain","wall","base","damage","distance","feeling","pair","savings","staff","sugar","target","text","animal","author","budget","discount","file","ground","lesson","minute","officer","phase","reference","register","sky","stage","stick","title","trouble","bowl","bridge","campaign","character","club","edge","evidence","fan","letter","lock","maximum","novel","option","pack","park","quarter","skin","sort","weight","baby","background","carry","dish","factor","fruit","glass","joint","master","muscle","red","strength","traffic","trip","vegetable","appeal","chart","gear","ideal","kitchen","land","log","mother","net","party","principle","relative","sale","season","signal","spirit","street","tree","wave","belt","bench","commission","copy","drop","minimum","path","progress","project","sea","south","status","stuff","ticket","tour","angle","blue","breakfast","confidence","daughter","degree","doctor","dot","dream","duty","essay","father","fee","finance","hour","juice","luck","milk","mouth","peace","pipe","stable","storm","substance","team","trick","afternoon","bat","beach","blank","catch","chain","consideration","cream","crew","detail","gold","interview","kid","mark","mission","pain","pleasure","score","screw","sex","shop","shower","suit","tone","window","agent","band","bath","block","bone","calendar","candidate","cap","coat","contest","corner","court","cup","district","door","east","finger","garage","guarantee","hole","hook","implement","layer","lecture","lie","manner","meeting","nose","parking","partner","profile","rice","routine","schedule","swimming","telephone","tip","winter","airline","bag","battle","bed","bill","bother","cake","code","curve","designer","dimension","dress","ease","emergency","evening","extension","farm","fight","gap","grade","holiday","horror","horse","host","husband","loan","mistake","mountain","nail","noise","occasion","package","patient","pause","phrase","proof","race","relief","sand","sentence","shoulder","smoke","stomach","string","tourist","towel","vacation","west","wheel","wine","arm","aside","associate","bet","blow","border","branch","breast","brother","buddy","bunch","chip","coach","cross","document","draft","dust","expert","floor","god","golf","habit","iron","judge","knife","landscape","league","mail","mess","native","opening","parent","pattern","pin","pool","pound","request","salary","shame","shelter","shoe","silver","tackle","tank","trust","assist","bake","bar","bell","bike","blame","boy","brick","chair","closet","clue","collar","comment","conference","devil","diet","fear","fuel","glove","jacket","lunch","monitor","mortgage","nurse","pace","panic","peak","plane","reward","row","sandwich","shock","spite","spray","surprise","till","transition","weekend","welcome","yard","alarm","bend","bicycle","bite","blind","bottle","cable","candle","clerk","cloud","concert","counter","flower","grandfather","harm","knee","lawyer","leather","load","mirror","neck","pension","plate","purple","ruin","ship","skirt","slice","snow","specialist","stroke","switch","trash","tune","zone","anger","award","bid","bitter","boot","bug","camp","candy","carpet","cat","champion","channel","clock","comfort","cow","crack","engineer","entrance","fault","grass","guy","hell","highlight","incident","island","joke","jury","leg","lip","mate","motor","nerve","passage","pen","pride","priest","prize","promise","resident","resort","ring","roof","rope","sail","scheme","script","sock","station","toe","tower","truck","witness","can","will","other","use","make","good","look","help","go","great","being","still","public","read","keep","start","give","human","local","general","specific","long","play","feel","high","put","common","set","change","simple","past","big","possible","particular","major","personal","current","national","cut","natural","physical","show","try","check","second","call","move","pay","let","increase","single","individual","turn","ask","buy","guard","hold","main","offer","potential","professional","international","travel","cook","alternative","special","working","whole","dance","excuse","cold","commercial","low","purchase","deal","primary","worth","fall","necessary","positive","produce","search","present","spend","talk","creative","tell","cost","drive","green","support","glad","remove","return","run","complex","due","effective","middle","regular","reserve","independent","leave","original","reach","rest","serve","watch","beautiful","charge","active","break","negative","safe","stay","visit","visual","affect","cover","report","rise","walk","white","junior","pick","unique","classic","final","lift","mix","private","stop","teach","western","concern","familiar","fly","official","broad","comfortable","gain","rich","save","stand","young","heavy","lead","listen","valuable","worry","handle","leading","meet","release","sell","finish","normal","press","ride","secret","spread","spring","tough","wait","brown","deep","display","flow","hit","objective","shoot","touch","cancel","chemical","cry","dump","extreme","push","conflict","eat","fill","formal","jump","kick","opposite","pass","pitch","remote","total","treat","vast","abuse","beat","burn","deposit","print","raise","sleep","somewhere","advance","consist","dark","double","draw","equal","fix","hire","internal","join","kill","sensitive","tap","win","attack","claim","constant","drag","drink","guess","minor","pull","raw","soft","solid","wear","weird","wonder","annual","count","dead","doubt","feed","forever","impress","repeat","round","sing","slide","strip","wish","combine","command","dig","divide","equivalent","hang","hunt","initial","march","mention","spiritual","survey","tie","adult","brief","crazy","escape","gather","hate","prior","repair","rough","sad","scratch","sick","strike","employ","external","hurt","illegal","laugh","lay","mobile","nasty","ordinary","respond","royal","senior","split","strain","struggle","swim","train","upper","wash","yellow","convert","crash","dependent","fold","funny","grab","hide","miss","permit","quote","recover","resolve","roll","sink","slip","spare","suspect","sweet","swing","twist","upstairs","usual","abroad","brave","calm","concentrate","estimate","grand","male","mine","prompt","quiet","refuse","regret","reveal","rush","shake","shift","shine","steal","suck","surround","bear","brilliant","dare","dear","delay","drunk","female","hurry","inevitable","invite","kiss","neat","pop","punch","quit","reply","representative","resist","rip","rub","silly","smile","spell","stretch","stupid","tear","temporary","tomorrow","wake","wrap","yesterday","Thomas","Tom","Lieuwe"];

let LEVELS = {
0: {
    // TODO!
},
debug: {
    spawn_room: "00",
    rooms: {
        "00": {
            player: {
                spawn: {
                    "00": { x: 500, y: 300 },
                    "01": { x: 860, y: 485 },
                },
                velocity: {
                    "00": { x: 0, y: 10 },
                    "01": { x: 0, y: 5 },
                },
            },
            walls: [
                {x:75, y:300, width:50, height:550},
                {x:925, y:300, width:50, height:550},
                {x:300, y:300, width:100, height:100},
                {x:500, y:550, width:800, height:50},
                {x:500, y:50, width:800, height:50},
                {x:300, y:300, width:100, height:100},
            ],
            backdrops: [
                {x:500, y:300, width:900, height:550},
            ],
            exits: [
                {x:860, y:485, width:80, height:80, to:"01"},
            ],
            buttons: [
            ],
        },
        "01": {
            player: {
                spawn: {
                    "00": { x: 140, y: 485 },
                    "01": { x: 500, y: 300 },
                },
                velocity: {
                    "00": { x: 0, y: 5 },
                    "01": { x: 0, y: 10 },
                },
            },
            walls: [
                {x:75, y:300, width:50, height:550},   // 0: left wall
                {x:925, y:300, width:50, height:550},  // 1: right wall
                {x:750, y:300, width:300, height:100}, // 2: right floating block
                {x:500, y:550, width:800, height:50},  // 3: bottom wall
                {x:500, y:50, width:800, height:50},   // 4: top wall
                {x:300, y:300, width:100, height:100}, // 5: left floating block
                {x:625, y:162.5, width:50, height:175}, // 6: door
            ],
            backdrops: [
                {x:500, y:300, width:900, height:550},
            ],
            exits: [
                {x:140, y:485, width:80, height:80, to:"00"},
            ],
            buttons: [
                {x:500, y:108, width: 64, height: 64, wallidx:6},
            ],
        },
    },
},
};
////////////////////////////////////////////////////////////////////////////////
// util.js: Utility functions.

function Linspace(a,b,d,incl=true) {
    let t = [];
    const end = incl ? b : b-d;
    for (let i = a; i <= end; i += d) {
        t.push(i);
    }
    return t;
}

function Max(ar) {
    return Math.max.apply(Math, ar);
}

function Min(ar) {
    return Math.min.apply(Math, ar);
}

function Sigs(n, dig=3) {
    return Math.round(n * Math.pow(10, dig)) / Math.pow(10, dig);
}

function RandInt(l,h) {
    // Range = [l,h-1]
    return Math.floor(Math.random() * (h-l)) + l;
}

function RandID(len=6) {
    let result           = "";
    let characters       = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let charactersLength = characters.length;
    for (let i = 0; i < len; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function RandNormal(mu, sigma, nsamples=6){
    if(!sigma) sigma = 1
    if(!mu) mu=0

    var run_total = 0
    for(var i=0 ; i<nsamples ; i++){
       run_total += Math.random()
    }

    return sigma*(run_total - nsamples/2)/(nsamples/2) + mu
}

function CapFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function RandName(last="") {
    if (last != "") {
        return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + " " + last;
    }
    return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + " " + 
        CapFirst(LAST_NAMES[RandInt(0, LAST_NAMES.length)]);
}

function Cot(v) { return 1 / Math.tan(v); }
function Sin(v) { return Math.sin(v); }
function Cos(v) { return Math.cos(v); }
function Csc(v) { return 1 / Math.sin(v); }
function Ln(v) { return Math.log(v) / Math.log(Math.E); }
function Sqr(v) { return Math.pow(v,2); }
function Sqrt(v) { return Math.sqrt(v); }
function Cube(v) { return Math.pow(v,3); }
function Fourth(v) { return Math.pow(v,4); }
function Exp(v) { return Math.exp(v); }
function Log10(v) { return Math.log10(v); }
function Pow(b,e) { return Math.pow(b, e); }
function Abs(v) { return Math.abs(v); }
function Round(v) { return Math.round(v); }

// Returns value "v" limited by "min" and "max".
function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

function FuzzyEquals(v1, v2, fuzz) {
    return Abs(v1 - v2) < fuzz;
}

function GameToPIXIX(x) {
    return GAME_LEFT + x * GAME_SCALE;
}

function GameToPIXIY(y) {
    return GAME_TOP + y * GAME_SCALE;
}

function Contains(x, y, rx, ry, rw, rh) {
    return x > rx - rw/2 && x < rx + rw/2 && y > ry - rh/2 && y < ry + rh/2;
}

function Log(msg) { LogDebug(msg); }

function LogFatal(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.FATAL) { console.log("FATL: "+msg); }
}

function LogError(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.ERROR) { console.log("ERR : "+msg); }
}

function LogWarn(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.WARN) { console.log("WARN: "+msg); }
}

function LogInfo(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.INFO) { console.log("INFO: "+msg); }
}

function LogDebug(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.DEBUG) { console.log("DBUG: "+msg); }
}

function LogTrace(msg) {
    if (LOG_LEVEL >= LOG_LEVELS.TRACE) { console.log("TRAC: "+msg); }
}
////////////////////////////////////////////////////////////////////////////////
// main.js: Main program.

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

let content = new PIXI.Container();
let G_draw_layers = [];
G_draw_layers.push(new PIXI.Container()); // 0: Background.
G_draw_layers.push(new PIXI.Container()); // 1: Mid-Background.
G_draw_layers.push(new PIXI.Container()); // 2: Main stage layer.
G_draw_layers.push(new PIXI.Container()); // 3: Foreground.
G_draw_layers.push(new PIXI.Container()); // 4: UI.
let G_graphics = [];
G_graphics.push(new PIXI.Graphics()); // 0: Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 1: Mid-Background Graphics.
G_graphics.push(new PIXI.Graphics()); // 2: Main stage Graphics.
G_graphics.push(new PIXI.Graphics()); // 3: Foreground Graphics.
G_graphics.push(new PIXI.Graphics()); // 4: UI Graphics.
app.stage.addChild(content);
content.addChild(G_draw_layers[0]);
G_draw_layers[0].addChild(G_graphics[0]);
content.addChild(G_draw_layers[1]);
G_draw_layers[1].addChild(G_graphics[1]);
content.addChild(G_draw_layers[2]);
G_draw_layers[2].addChild(G_graphics[2]);
content.addChild(G_draw_layers[3]);
G_draw_layers[3].addChild(G_graphics[3]);
content.addChild(G_draw_layers[4]);
G_draw_layers[4].addChild(G_graphics[4]);

let G_objs = {};

let G_keys = KEYS_INIT;

let G_pause = false;
let G_needs_update = false;
let G_loaded = false;
let G_actions = [];

function Init() {
    let stage = new MainMenu();
    G_objs["stage"] = stage;
    G_needs_update = true;
}

app.ticker.add((dT) => {
    if (G_pause == true) { return; }
    if (G_loaded == false) { Init(); G_loaded = true; }
    if (G_objs.hasOwnProperty("stage") == false) { return; }

    for (let k in G_objs) {
        G_objs[k].Update(dT);
    }
    
    // TODO: Track lurkers and lerpers for destroy-ing.

    // If some class set the global update value to true, redraw graphics.
    if (G_needs_update == true) {
        for (let i = 0; i < G_graphics.length; i++) {
            G_graphics[i].clear();
        }
        for (let k in G_objs) {
            G_objs[k].Draw();
        }
        G_needs_update = false;
    }

    while (G_actions.length > 0) {
        let act = G_actions[0];

        LogInfo("Global action " + act + ".");

        if (act.includes("load debug")) {
            // Action: load TestGame.

            let toks = act.split(",");
            G_objs["stage"].Destroy();
            delete G_objs["stage"];
            G_objs["stage"] = new GameStage("debug", toks[1], toks[2]);
            G_needs_update = true;

        }

        G_actions.splice(0, 1);
    }

});
////////////////////////////////////////////////////////////////////////////////
// entities.js: Entities.

class Entity {
    constructor(a) {
        this.active = true;

        this.id = a.id;
        this.x = a.x;
        this.y = a.y;

        this.sprites = {};
        this.texts = {};
        this.textures = {};
    }

    AddSprite(a) {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let w = a.width;
        let h = a.height;
        let fname = "gfx/"+a.filename;
        let anc = {x:0.5, y:0.5};
        let dl = 2;

        if (a.hasOwnProperty("anchor_x")) { anc.x = a.anchor_x; }
        if (a.hasOwnProperty("anchor_y")) { anc.y = a.anchor_y; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }
        
        this.textures[id] = PIXI.Texture.from(fname);

        this.sprites[id] = new PIXI.Sprite(this.textures[id]);
        this.sprites[id].anchor.set(anc.x, anc.y);
        this.sprites[id].position.set(x, y);
        this.sprites[id].width = w;
        this.sprites[id].height = h;
        this.sprites[id].draw_layer = dl;
        G_draw_layers[dl].addChild(this.sprites[id]);
    }

    AddText(a) {
        let id = a.id;
        let x = a.x;
        let y = a.y;
        let t = a.text;
        let ff = "Courier New";
        let fs = 12;
        let fc = 0xffffff;
        let align = "center";
        let dl = 4;

        if (a.hasOwnProperty("fontFamily")) { ff = a.fontFamily; }
        if (a.hasOwnProperty("fontSize")) { fs = a.fontSize;}
        if (a.hasOwnProperty("fill")) { fc = a.fill; }
        if (a.hasOwnProperty("align")) { align = a.align; }
        if (a.hasOwnProperty("draw_layer")) { dl = a.draw_layer; }

        let anc = {x:0.5, y:0.5};
        if (align == "left") { anc.x = 0; }
        else if (align == "right") { anc.x = 1; }

        this.texts[id] = new PIXI.Text(t, {
            fontFamily: ff, fontSize: fs, fill: fc, align: align,
        });
        this.texts[id].anchor.set(anc.x, anc.y);
        this.texts[id].position.set(x, y);
        this.texts[id].draw_layer = dl;
        G_draw_layers[dl].addChild(this.texts[id]);
    }

    Loaded() {
        let loaded = true;
        for (let k in this.textures) {
            if (k.loaded == false) {
                loaded = false;
                break;
            }
        }
        return loaded;
    }

    Destroy() {
        this.active = false;
        for (let k in this.sprites) {
            G_draw_layers[this.sprites[k].draw_layer].removeChild(this.sprites[k]);
            delete this.sprites[k];
        }
        for (let k in this.texts) {
            G_draw_layers[this.texts[k].draw_layer].removeChild(this.texts[k]);
            delete this.texts[k];
        }
        for (let k in this.textures) {
            this.textures[k].destroy();
            delete this.textures[k];
        }
    }

    Update(dT) {}
    Draw() {}
}

// Lerper is a cool class. It will call a callback and provide a value between
// 0 and 1 until the entire Lerp duration has completed. The callback can also
// optionally have a second parameter that is given as "true" on final call.
// Lerpers can also be drawn for debug purposes with the "d" function.
// Lerper is a "quasi-entity".
class Lerper {
    constructor(dur, cb, d=function(){}) {
        this.dur = dur;
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lerper.
    }

    Destroy() {}

    Update(dT) {
        // On the final tick, call the callback with an argument of 1 = 100%.
        if (this.elapsed + dT > this.dur) {
            this.cb(1, true);
            this.active = false;
            return;
        }

        // Otherwise, do the normal routine.
        this.elapsed += dT;

        this.cb(this.elapsed / this.dur, false);
    }

    Draw() {
        this.d();
    }
}

// Lurker is similar to lerper, but it will run continuously until the callback
// returns a value of "false". At that point it no longer calls the callback.
// Lurkers can also be drawn for debug with the "d" function.
// Lerper is a "quasi-entity".
class Lurker {
    constructor(cb, d=function(){}) {
        this.cb = cb;
        this.d = d;
        this.elapsed = 0;
        this.active = true;
        this.vals = {good:false}; // Can hold additional values per lurker.
    }

    Destroy() {}

    Update(dT) {
        if (!this.active) { return; }

        this.elapsed += dT;

        this.active = this.cb(dT);
    }

    Draw() {
        this.d();
    }
}

class Player extends Entity {
    constructor(x, y, vx, vy) {
        super({id:"player", x:x, y:y});
        
        // NOTE: x, y, width, and height are in absolute units (x:[0,1000], y:[0,600]).
        // Player will be scaled for rendering with PIXI.

        this.width = 64;
        this.height = 64;

        this.vx = vx;
        this.vy = vy;

        this.speed_x = 4;
        this.speed_y = 4;

        this.grounded = false;
        this.facing_right = true;
        this.right_side_up = true;

        this.AddSprite({id:"player", x: this.x, y: this.y, width: this.width*GAME_SCALE, 
            height: this.height*GAME_SCALE, filename: "still_1.png"});
    }

    Reset() {
        this.grounded = false;
        this.facing_right = true;
        this.right_side_up = true;
        if (this.sprites.player.scale.x < 0) {
            this.sprites.player.scale.x = -this.sprites.player.scale.x;
        }
        if (this.sprites.player.scale.y < 0) {
            this.sprites.player.scale.y = -this.sprites.player.scale.y;
        }
    }

    SyncWithSprite() {
        this.sprites.player.x = GameToPIXIX(this.x);
        this.sprites.player.y = GameToPIXIY(this.y);
    }

    CheckGrounding(ci) {
        if (this.grounded == true) { return; }

        if (ci.bottom.idx != -1) {
            let f = null;
            if (ci.bottom.cat == COLLISION_CATEGORY.WALL) {
                f = G_objs["stage"].walls[ci.bottom.idx];
            } else if (ci.bottom.cat == COLLISION_CATEGORY.BUTTON) {
                f = G_objs["stage"].buttons[ci.bottom.idx];
            } else {
                LogError("Unkown collision category.");
                return;
            }
            let d = -1;
            let x = this.x;
            let y = this.y + this.height/2;

            // Perform an inverse Raycast upwards.
            for (let i = 0; i < this.height; i += 0.1) {
                if (!Contains(x, y - i, f.x, f.y, f.width, f.height)) {
                    d = i;
                    break;
                }
            }

            if (d > 0) {
                this.y -= d;
                LogTrace("Corrected player grounding by " + Sigs(-d,1));
            }
        }

        if (ci.top.idx != -1) {
            let f = null;
            if (ci.top.cat == COLLISION_CATEGORY.WALL) {
                f = G_objs["stage"].walls[ci.top.idx];
            } else if (ci.top.cat == COLLISION_CATEGORY.BUTTON) {
                f = G_objs["stage"].buttons[ci.top.idx];
            } else {
                LogError("Unkown collision category.");
                return;
            }
            let d = -1;
            let x = this.x;
            let y = this.y - this.height/2;

            // Perform an inverse Raycast downwards.
            for (let i = 0; i < this.height; i += 0.1) {
                if (!Contains(x, y + i, f.x, f.y, f.width, f.height)) {
                    d = i;
                    break;
                }
            }

            if (d > 0) {
                this.y += d;
                LogDebug("Corrected player grounding by " + Sigs(d,1));
            }
        }
    }

    Update(dT) {
        if (this.active == false) { return; }

        this.x += this.vx * dT;
        this.y += this.vy * dT;

        let walls = G_objs["stage"].walls;
        let buttons = G_objs["stage"].buttons;
        let coll_pts = {
            bottom:{x: this.x, y: this.y + this.height/2 + 1, cat: COLLISION_CATEGORY.WALL, idx: -1},
            left:  {x: this.x - this.width*0.26, y: this.y, cat: COLLISION_CATEGORY.WALL, idx: -1},
            right: {x: this.x + this.width*0.26, y: this.y, cat: COLLISION_CATEGORY.WALL, idx: -1},
            top:   {x: this.x, y: this.y - this.height/2 - 1, cat: COLLISION_CATEGORY.WALL, idx: -1},
        };
        for (let i = 0; i < walls.length; i++) {
            let w = walls[i];
            if (Contains(coll_pts.left.x, coll_pts.left.y, w.x, w.y, w.width, w.height)) {
                coll_pts.left.idx = i;
                break;
            }
            if (Contains(coll_pts.right.x, coll_pts.right.y, w.x, w.y, w.width, w.height)) {
                coll_pts.right.idx = i;
                break;
            }
            if (Contains(coll_pts.bottom.x, coll_pts.bottom.y, w.x, w.y, w.width, w.height)) {
                coll_pts.bottom.idx = i;
                break;
            }
            if (Contains(coll_pts.top.x, coll_pts.top.y, w.x, w.y, w.width, w.height)) {
                coll_pts.top.idx = i;
                break;
            }
        }
        for (let i = 0; i < buttons.length; i++) {
            let b = buttons[i];
            if (Contains(coll_pts.bottom.x, coll_pts.bottom.y, b.x, b.y, b.width, b.height)) {
                coll_pts.bottom.idx = i;
                coll_pts.bottom.cat = COLLISION_CATEGORY.BUTTON;
                break;
            }
            if (Contains(coll_pts.top.x, coll_pts.top.y, b.x, b.y, b.width, b.height)) {
                coll_pts.top.idx = i;
                coll_pts.top.cat = COLLISION_CATEGORY.BUTTON;
                break;
            }
            if (Contains(coll_pts.left.x, coll_pts.left.y, b.x, b.y, b.width, b.height)) {
                coll_pts.left.idx = i;
                coll_pts.left.cat = COLLISION_CATEGORY.BUTTON;
                break;
            }
            if (Contains(coll_pts.right.x, coll_pts.right.y, b.x, b.y, b.width, b.height)) {
                coll_pts.right.idx = i;
                coll_pts.right.cat = COLLISION_CATEGORY.BUTTON;
                break;
            }
        }

        // Bottom collision.
        if (coll_pts.bottom.idx != -1) {
            this.CheckGrounding(coll_pts);
            this.vx = 0;
            this.vy = 0;
            this.grounded = true;
        } else if (coll_pts.top.idx != -1) {
            this.CheckGrounding(coll_pts);
            if (coll_pts.top.cat == COLLISION_CATEGORY.WALL) {
                this.vx = 0;
                this.vy = 0;
                this.grounded = true;
            } else if (coll_pts.top.cat == COLLISION_CATEGORY.BUTTON) {
                G_objs["stage"].PressButton(coll_pts.top.idx);
            }
        } else if (this.grounded) {
            LogDebug("Started floating?");
            this.grounded = false;
        }

        // Left/Right collision.
        if (coll_pts.left.idx != -1) {
            this.vx = 0;
            this.x += 1;
        } else if (coll_pts.right.idx != -1) {
            this.vx = 0;
            this.x -= 1;
        }

        // Keyboard input.
        if (this.grounded) {
            if (coll_pts.left.idx == -1 && coll_pts.right.idx == -1) {
                if (G_keys.KeyD.down) {
                    this.vx = this.speed_x;
                    if (this.facing_right == false) {
                        this.sprites.player.scale.x = -this.sprites.player.scale.x;
                        this.facing_right = true;
                    }
                } else if (G_keys.KeyA.down) {
                    if (this.facing_right == true) {
                        this.sprites.player.scale.x = -this.sprites.player.scale.x;
                        this.facing_right = false;
                    }
                    this.vx = -this.speed_x;
                } else {
                    this.vx = 0;
                }
            }

            if (G_keys.Space.down) {
                this.grounded = false;
                this.sprites.player.scale.y = -this.sprites.player.scale.y;
                if (this.right_side_up) {
                    this.vy = -this.speed_y;
                    this.right_side_up = false;
                } else {
                    this.grounded = false;
                    this.vy = this.speed_y;
                    this.right_side_up = true;
                }
            }
        }

        this.SyncWithSprite();
    }
}

class Button extends Entity {
    constructor(x, y, w, h, widx) {
        super({id:"btn", x:x, y:y});

        this.width = w;
        this.height = h;

        this.wallidx = widx;

        this.AddSprite({id:"button", x: GameToPIXIX(this.x), y: GameToPIXIY(this.y),
            width: this.width * GAME_SCALE, height: this.height * GAME_SCALE, filename: "wall.png"});
    }
}////////////////////////////////////////////////////////////////////////////////
// stages.js: Game stages. 

class Stage extends Entity {
    constructor() {
        super({"id":"stage", "x":0, "y":0});
        this.active = true;

        content.visible = false;
    }

    Reset() {}
}

class MainMenu extends Stage {
    constructor() {
        super();

        this.menu_line_x = 200;
        this.menu_line_x_spacing = 10;
        this.menu_line_y = 100;
        this.menu_line_y_spacing = 100;
        this.menu_fontSize = 64;
        this.menu_num_items = 2;

        // Play menu item.
        this.AddText({id:"play", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y, text:"Play", fontSize: this.menu_fontSize,
            align:"left"});

        // About menu item.
        this.AddText({id:"about", x: this.menu_line_x + this.menu_line_x_spacing,
            y: this.menu_line_y + this.menu_line_y_spacing, text:"About",
            fontSize: this.menu_fontSize, align:"left"});

        // Menu pointer.
        this.AddText({id:"ptr", x: this.menu_line_x - this.menu_line_x_spacing,
            y: this.menu_line_y, text:">", fontSize: this.menu_fontSize,
            align:"right"});

        this.pointer = this.texts["ptr"];

        this.pointer_moved = false;
        
        content.visible = false;
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (content.visible == false) {
            content.visible = this.Loaded();
            return;
        }

        if (G_keys.KeyQ.down) {
            // DEBUG KEY.

            G_actions.push("load debug,00,00");
            this.active = false;

        } else if (G_keys.KeyW.down || G_keys.ArrowUp.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y > this.menu_line_y+1) {
                this.pointer_moved = true;
                this.pointer.y -= this.menu_line_y_spacing;
            }

        } else if (G_keys.KeyS.down || G_keys.ArrowDown.down) {

            if (this.pointer_moved == false &&
                    this.pointer.y < this.menu_line_y + 
                    (this.menu_line_y_spacing*(this.menu_num_items-1))) {
                this.pointer_moved = true;
                this.pointer.y += this.menu_line_y_spacing;
            }
        
        } else if (G_keys.Enter.down) {

            let item_number = Round((this.pointer.y - this.menu_line_y) / this.menu_line_y_spacing);
            if (item_number == 0) {
                this.active = false;
                G_actions.push("load debug,00,00");
            } else if (item_number == 1) {
                // TODO: other buttons.
            }

        } else {

            this.pointer_moved = false;

        }
    }
}

class GameStage extends Stage {
    constructor(lvlname, toroom="00", fromroom="00") {
        super();

        this.level_name = lvlname;
        this.level = JSON.parse(JSON.stringify(LEVELS[lvlname]));
        this.current_room = toroom;
        this.previous_room = fromroom;
        this.walls = this.level.rooms[this.current_room].walls;
        this.backdrops = this.level.rooms[this.current_room].backdrops;
        this.exits = this.level.rooms[this.current_room].exits;

        this.AddSprite({id:"bg", x:WIDTH/2, y:HEIGHT/2, 
            width:GAME_WIDTH, height:GAME_HEIGHT,
            draw_layer:0, filename:"background.png"});

        this.player = new Player(
            this.level.rooms[this.current_room].player.spawn[this.previous_room].x,
            this.level.rooms[this.current_room].player.spawn[this.previous_room].y,
            this.level.rooms[this.current_room].player.velocity[this.previous_room].x,
            this.level.rooms[this.current_room].player.velocity[this.previous_room].y);
        
        this.buttons = [];
        for (let i = 0; i < this.level.rooms[this.current_room].buttons.length; i++) {
            let b = this.level.rooms[this.current_room].buttons[i];
            this.buttons.push(new Button(b.x, b.y, b.width, b.height, b.wallidx));
        }
        
        this.detected_reset = false;
        this.detected_exit = false;
    }

    Destroy() {
        super.Destroy();
        this.player.Destroy();
    }

    Reset() {
        this.player.x = this.level.rooms[this.current_room].player.spawn[this.previous_room].x;
        this.player.y = this.level.rooms[this.current_room].player.spawn[this.previous_room].y;
        this.player.vx = this.level.rooms[this.current_room].player.velocity[this.previous_room].x;
        this.player.vy = this.level.rooms[this.current_room].player.velocity[this.previous_room].y;
        this.player.Reset();
    }

    Loaded() {
        return super.Loaded() && this.player.Loaded();
    }

    Update(dT) {
        if (this.active == false) { return; }

        if (this.detected_reset) {
            if (G_keys.KeyR.down == false) {
                this.detected_reset = false;
                this.Reset();
                LogDebug("Resetting.");
                return;
            }
        } else {
            if (G_keys.KeyR.down) {
                this.detected_reset = true;
                LogTrace("Game will reset.");
            } 
        }

        if (this.detected_exit) {
            if (G_keys.KeyW.down == false) {
                LogTrace("Player wants to exit.");
                this.detected_exit = false;

                for (let i = 0; i < this.exits.length; i++) {
                    let e = this.exits[i];
                    if (Contains(this.player.x, this.player.y, e.x, e.y, e.width, e.height)) {
                        G_actions.push("load debug,"+e.to+","+this.current_room);
                    }
                }
            }
        } else {
            if (G_keys.KeyW.down) {
                this.detected_exit = true;
                LogTrace("Player will try to exit.");
            }
        }

        if (content.visible == false) {
            content.visible = this.Loaded() && this.player.Loaded();
            return;
        }

        this.player.Update(dT);
    }

    PressButton(idx) {
        let wallidx = this.buttons[idx].wallidx;
        LogTrace("Splicing wall " + wallidx + " and button " + idx + ".");
        this.walls.splice(wallidx, 1);
        this.buttons[idx].Destroy();
        this.buttons.splice(idx, 1);
        G_needs_update = true;
    }

    Draw() {
        // Draw backdrops.
        G_graphics[1].lineStyle(0, 0);
        for (let i=0; i < this.backdrops.length; i++) {
            let k = this.backdrops[i];
            G_graphics[1].beginFill(0x222222);
            G_graphics[1].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[1].endFill();
        }

        // Draw Walls.
        G_graphics[2].lineStyle(1, 0x0000ff);
        for (let i=0; i < this.walls.length; i++) {
            let k = this.walls[i];
            G_graphics[2].beginFill(0x000066, 0.5);
            G_graphics[2].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[2].endFill();
        }

        // Draw Exits.
        G_graphics[3].lineStyle(1, 0x00ff00);
        for (let i=0; i < this.exits.length; i++) {
            let k = this.exits[i];
            G_graphics[3].beginFill(0x006600, 0.5);
            G_graphics[3].drawRect(
                GAME_LEFT + (k.x - k.width/2) * GAME_SCALE,
                GAME_TOP + (k.y - k.height/2) * GAME_SCALE,
                k.width * GAME_SCALE, k.height * GAME_SCALE);
            G_graphics[3].endFill();
        }
    }
}
////////////////////////////////////////////////////////////////////////////////
// listeners.js: Interaction listeners.

document.addEventListener("keydown", function(evt) {
    if (G_keys.hasOwnProperty(evt.key) == false) {
        G_keys[evt.code] = {down: true, time_down:Date.now(), time_up:0};
        return;
    }

    G_keys[evt.code].down = true;
    G_keys[evt.code].time_down = Date.now();
}, false);

document.addEventListener("keyup", function(evt) {
    G_keys[evt.code].down = false;
    G_keys[evt.code].time_up = Date.now();
}, false);
////////////////////////////////////////////////////////////////////////////////
