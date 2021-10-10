// Sky Hoffert

const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const WIDTH = GAME_WIDTH*2;
const HEIGHT = GAME_HEIGHT*2;

const PI = 3.1415926;

const LINE_HEIGHT = GAME_HEIGHT*3/4;

const N_LAYERS_MIN = 3;
const N_LAYERS_MAX = 6;
const LAYER_HEIGHT_MIN = 2;
const LAYER_HEIGHT_MAX = 5;
const N_INPUTS = 5;

const TREE_SIZE = 44;
const BIRD_SIZE = 32;

const BIRD_SPAWN_SCORE = 20;
const ENTITY_SPAWN_POSITION = GAME_WIDTH*9/8;
const ENTITY_LEFT_BOUND = -GAME_WIDTH/8;

const FIRST_NAMES = ["abandoned","able","absolute","adorable","adventurous","academic","acceptable","acclaimed","accomplished","accurate","aching","acidic","acrobatic","active","actual","adept","admirable","admired","adolescent","adorable","adored","advanced","afraid","affectionate","aged","aggravating","aggressive","agile","agitated","agonizing","agreeable","ajar","alarmed","alarming","alert","alienated","alive","all","altruistic","amazing","ambitious","ample","amused","amusing","anchored","ancient","angelic","angry","anguished","animated","annual","another","antique","anxious","any","apprehensive","appropriate","apt","arctic","arid","aromatic","artistic","ashamed","assured","astonishing","athletic","attached","attentive","attractive","austere","authentic","authorized","automatic","avaricious","average","aware","awesome","awful","awkward","babyish","bad","back","baggy","bare","barren","basic","beautiful","belated","beloved","beneficial","better","best","bewitched","big","big-hearted","biodegradable","bite-sized","bitter","black","black-and-white","bland","blank","blaring","bleak","blind","blissful","blond","blue","blushing","bogus","boiling","bold","bony","boring","bossy","both","bouncy","bountiful","bowed","brave","breakable","brief","bright","brilliant","brisk","broken","bronze","brown","bruised","bubbly","bulky","bumpy","buoyant","burdensome","burly","bustling","busy","buttery","buzzing","calculating","calm","candid","canine","capital","carefree","careful","careless","caring","cautious","cavernous","celebrated","charming","cheap","cheerful","cheery","chief","chilly","chubby","circular","classic","clean","clear","clear-cut","clever","close","closed","cloudy","clueless","clumsy","cluttered","coarse","cold","colorful","colorless","colossal","comfortable","common","compassionate","competent","complete","complex","complicated","composed","concerned","concrete","confused","conscious","considerate","constant","content","conventional","cooked","cool","cooperative","coordinated","corny","corrupt","costly","courageous","courteous","crafty","crazy","creamy","creative","creepy","criminal","crisp","critical","crooked","crowded","cruel","crushing","cuddly","cultivated","cultured","cumbersome","curly","curvy","cute","cylindrical","damaged","damp","dangerous","dapper","daring","darling","dark","dazzling","dead","deadly","deafening","dear","dearest","decent","decimal","decisive","deep","defenseless","defensive","defiant","deficient","definite","definitive","delayed","delectable","delicious","delightful","delirious","demanding","dense","dental","dependable","dependent","descriptive","deserted","detailed","determined","devoted","different","difficult","digital","diligent","dim","dimpled","dimwitted","direct","disastrous","discrete","disfigured","disgusting","disloyal","dismal","distant","downright","dreary","dirty","disguised","dishonest","dismal","distant","distinct","distorted","dizzy","dopey","doting","double","downright","drab","drafty","dramatic","dreary","droopy","dry","dual","dull","dutiful","each","eager","earnest","early","easy","easy-going","ecstatic","edible","educated","elaborate","elastic","elated","elderly","electric","elegant","elementary","elliptical","embarrassed","embellished","eminent","emotional","empty","enchanted","enchanting","energetic","enlightened","enormous","enraged","entire","envious","equal","equatorial","essential","esteemed","ethical","euphoric","even","evergreen","everlasting","every","evil","exalted","excellent","exemplary","exhausted","excitable","excited","exciting","exotic","expensive","experienced","expert","extraneous","extroverted","extra-large","extra-small","fabulous","failing","faint","fair","faithful","fake","false","familiar","famous","fancy","fantastic","far","faraway","far-flung","far-off","fast","fat","fatal","fatherly","favorable","favorite","fearful","fearless","feisty","feline","female","feminine","few","fickle","filthy","fine","finished","firm","first","firsthand","fitting","fixed","flaky","flamboyant","flashy","flat","flawed","flawless","flickering","flimsy","flippant","flowery","fluffy","fluid","flustered","focused","fond","foolhardy","foolish","forceful","forked","formal","forsaken","forthright","fortunate","fragrant","frail","frank","frayed","free","French","fresh","frequent","friendly","frightened","frightening","frigid","frilly","frizzy","frivolous","front","frosty","frozen","frugal","fruitful","full","fumbling","functional","funny","fussy","fuzzy","gargantuan","gaseous","general","generous","gentle","genuine","giant","giddy","gigantic","gifted","giving","glamorous","glaring","glass","gleaming","gleeful","glistening","glittering","gloomy","glorious","glossy","glum","golden","good","good-natured","gorgeous","graceful","gracious","grand","grandiose","granular","grateful","grave","gray","great","greedy","green","gregarious","grim","grimy","gripping","grizzled","gross","grotesque","grouchy","grounded","growing","growling","grown","grubby","gruesome","grumpy","guilty","gullible","gummy","hairy","half","handmade","handsome","handy","happy","happy-go-lucky","hard","hard-to-find","harmful","harmless","harmonious","harsh","hasty","hateful","haunting","healthy","heartfelt","hearty","heavenly","heavy","hefty","helpful","helpless","hidden","hideous","high","high-level","hilarious","hoarse","hollow","homely","honest","honorable","honored","hopeful","horrible","hospitable","hot","huge","humble","humiliating","humming","humongous","hungry","hurtful","husky","icky","icy","ideal","idealistic","identical","idle","idiotic","idolized","ignorant","ill","illegal","ill-fated","ill-informed","illiterate","illustrious","imaginary","imaginative","immaculate","immaterial","immediate","immense","impassioned","impeccable","impartial","imperfect","imperturbable","impish","impolite","important","impossible","impractical","impressionable","impressive","improbable","impure","inborn","incomparable","incompatible","incomplete","inconsequential","incredible","indelible","inexperienced","indolent","infamous","infantile","infatuated","inferior","infinite","informal","innocent","insecure","insidious","insignificant","insistent","instructive","insubstantial","intelligent","intent","intentional","interesting","internal","international","intrepid","ironclad","irresponsible","irritating","itchy","jaded","jagged","jam-packed","jaunty","jealous","jittery","joint","jolly","jovial","joyful","joyous","jubilant","judicious","juicy","jumbo","junior","jumpy","juvenile","kaleidoscopic","keen","key","kind","kindhearted","kindly","klutzy","knobby","knotty","knowledgeable","knowing","known","kooky","kosher","lame","lanky","large","last","lasting","late","lavish","lawful","lazy","leading","lean","leafy","left","legal","legitimate","light","lighthearted","likable","likely","limited","limp","limping","linear","lined","liquid","little","live","lively","livid","loathsome","lone","lonely","long","long-term","loose","lopsided","lost","loud","lovable","lovely","loving","low","loyal","lucky","lumbering","luminous","lumpy","lustrous","luxurious","mad","made-up","magnificent","majestic","major","male","mammoth","married","marvelous","masculine","massive","mature","meager","mealy","mean","measly","meaty","medical","mediocre","medium","meek","mellow","melodic","memorable","menacing","merry","messy","metallic","mild","milky","mindless","miniature","minor","minty","miserable","miserly","misguided","misty","mixed","modern","modest","moist","monstrous","monthly","monumental","moral","mortified","motherly","motionless","mountainous","muddy","muffled","multicolored","mundane","murky","mushy","musty","muted","mysterious","naive","narrow","nasty","natural","naughty","nautical","near","neat","necessary","needy","negative","neglected","negligible","neighboring","nervous","new","next","nice","nifty","nimble","nippy","nocturnal","noisy","nonstop","normal","notable","noted","noteworthy","novel","noxious","numb","nutritious","nutty","obedient","obese","oblong","oily","oblong","obvious","occasional","odd","oddball","offbeat","offensive","official","old","old-fashioned","only","open","optimal","optimistic","opulent","orange","orderly","organic","ornate","ornery","ordinary","original","other","our","outlying","outgoing","outlandish","outrageous","outstanding","oval","overcooked","overdue","overjoyed","overlooked","palatable","pale","paltry","parallel","parched","partial","passionate","past","pastel","peaceful","peppery","perfect","perfumed","periodic","perky","personal","pertinent","pesky","pessimistic","petty","phony","physical","piercing","pink","pitiful","plain","plaintive","plastic","playful","pleasant","pleased","pleasing","plump","plush","polished","polite","political","pointed","pointless","poised","poor","popular","portly","posh","positive","possible","potable","powerful","powerless","practical","precious","present","prestigious","pretty","precious","previous","pricey","prickly","primary","prime","pristine","private","prize","probable","productive","profitable","profuse","proper","proud","prudent","punctual","pungent","puny","pure","purple","pushy","putrid","puzzled","puzzling","quaint","qualified","quarrelsome","quarterly","queasy","querulous","questionable","quick","quick-witted","quiet","quintessential","quirky","quixotic","quizzical","radiant","ragged","rapid","rare","rash","raw","recent","reckless","rectangular","ready","real","realistic","reasonable","red","reflecting","regal","regular","reliable","relieved","remarkable","remorseful","remote","repentant","required","respectful","responsible","repulsive","revolving","rewarding","rich","rigid","right","ringed","ripe","roasted","robust","rosy","rotating","rotten","rough","round","rowdy","royal","rubbery","rundown","ruddy","rude","runny","rural","rusty","sad","safe","salty","same","sandy","sane","sarcastic","sardonic","satisfied","scaly","scarce","scared","scary","scented","scholarly","scientific","scornful","scratchy","scrawny","second","secondary","second-hand","secret","self-assured","self-reliant","selfish","sentimental","separate","serene","serious","serpentine","several","severe","shabby","shadowy","shady","shallow","shameful","shameless","sharp","shimmering","shiny","shocked","shocking","shoddy","short","short-term","showy","shrill","shy","sick","silent","silky","silly","silver","similar","simple","simplistic","sinful","single","sizzling","skeletal","skinny","sleepy","slight","slim","slimy","slippery","slow","slushy","small","smart","smoggy","smooth","smug","snappy","snarling","sneaky","sniveling","snoopy","sociable","soft","soggy","solid","somber","some","spherical","sophisticated","sore","sorrowful","soulful","soupy","sour","Spanish","sparkling","sparse","specific","spectacular","speedy","spicy","spiffy","spirited","spiteful","splendid","spotless","spotted","spry","square","squeaky","squiggly","stable","staid","stained","stale","standard","starchy","stark","starry","steep","sticky","stiff","stimulating","stingy","stormy","straight","strange","steel","strict","strident","striking","striped","strong","studious","stunning","stupendous","stupid","sturdy","stylish","subdued","submissive","substantial","subtle","suburban","sudden","sugary","sunny","super","superb","superficial","superior","supportive","sure-footed","surprised","suspicious","svelte","sweaty","sweet","sweltering","swift","sympathetic","tall","talkative","tame","tan","tangible","tart","tasty","tattered","taut","tedious","teeming","tempting","tender","tense","tepid","terrible","terrific","testy","thankful","that","these","thick","thin","third","thirsty","this","thorough","thorny","those","thoughtful","threadbare","thrifty","thunderous","tidy","tight","timely","tinted","tiny","tired","torn","total","tough","traumatic","treasured","tremendous","tragic","trained","tremendous","triangular","tricky","trifling","trim","trivial","troubled","true","trusting","trustworthy","trusty","truthful","tubby","turbulent","twin","ugly","ultimate","unacceptable","unaware","uncomfortable","uncommon","unconscious","understated","unequaled","uneven","unfinished","unfit","unfolded","unfortunate","unhappy","unhealthy","uniform","unimportant","unique","united","unkempt","unknown","unlawful","unlined","unlucky","unnatural","unpleasant","unrealistic","unripe","unruly","unselfish","unsightly","unsteady","unsung","untidy","untimely","untried","untrue","unused","unusual","unwelcome","unwieldy","unwilling","unwitting","unwritten","upbeat","upright","upset","urban","usable","used","useful","useless","utilized","utter","vacant","vague","vain","valid","valuable","vapid","variable","vast","velvety","venerated","vengeful","verifiable","vibrant","vicious","victorious","vigilant","vigorous","villainous","violet","violent","virtual","virtuous","visible","vital","vivacious","vivid","voluminous","wan","warlike","warm","warmhearted","warped","wary","wasteful","watchful","waterlogged","watery","wavy","wealthy","weak","weary","webbed","wee","weekly","weepy","weighty","weird","welcome","well-documented","well-groomed","well-informed","well-lit","well-made","well-off","well-to-do","well-worn","wet","which","whimsical","whirlwind","whispered","white","whole","whopping","wicked","wide","wide-eyed","wiggly","wild","willing","wilted","winding","windy","winged","wiry","wise","witty","wobbly","woeful","wonderful","wooden","woozy","wordy","worldly","worn","worried","worrisome","worse","worst","worthless","worthwhile","worthy","wrathful","wretched","writhing","wrong","wry","yawning","yearly","yellow","yellowish","young","youthful","yummy","zany","zealous","zesty","zigzag","rocky"];
const LAST_NAMES = ["people","history","way","art","world","information","map","family","government","health","system","computer","meat","year","thanks","music","person","reading","method","data","food","understanding","theory","law","bird","literature","problem","software","control","knowledge","power","ability","economics","love","internet","television","science","library","nature","fact","product","idea","temperature","investment","area","society","activity","story","industry","media","thing","oven","community","definition","safety","quality","development","language","management","player","variety","video","week","security","country","exam","movie","organization","equipment","physics","analysis","policy","series","thought","basis","boyfriend","direction","strategy","technology","army","camera","freedom","paper","environment","child","instance","month","truth","marketing","university","writing","article","department","difference","goal","news","audience","fishing","growth","income","marriage","user","combination","failure","meaning","medicine","philosophy","teacher","communication","night","chemistry","disease","disk","energy","nation","road","role","soup","advertising","location","success","addition","apartment","education","math","moment","painting","politics","attention","decision","event","property","shopping","student","wood","competition","distribution","entertainment","office","population","president","unit","category","cigarette","context","introduction","opportunity","performance","driver","flight","length","magazine","newspaper","relationship","teaching","cell","dealer","debate","finding","lake","member","message","phone","scene","appearance","association","concept","customer","death","discussion","housing","inflation","insurance","mood","woman","advice","blood","effort","expression","importance","opinion","payment","reality","responsibility","situation","skill","statement","wealth","application","city","county","depth","estate","foundation","grandmother","heart","perspective","photo","recipe","studio","topic","collection","depression","imagination","passion","percentage","resource","setting","ad","agency","college","connection","criticism","debt","description","memory","patience","secretary","solution","administration","aspect","attitude","director","personality","psychology","recommendation","response","selection","storage","version","alcohol","argument","complaint","contract","emphasis","highway","loss","membership","possession","preparation","steak","union","agreement","cancer","currency","employment","engineering","entry","interaction","limit","mixture","preference","region","republic","seat","tradition","virus","actor","classroom","delivery","device","difficulty","drama","election","engine","football","guidance","hotel","match","owner","priority","protection","suggestion","tension","variation","anxiety","atmosphere","awareness","bread","climate","comparison","confusion","construction","elevator","emotion","employee","employer","guest","height","leadership","mall","manager","operation","recording","respect","sample","transportation","boring","charity","cousin","disaster","editor","efficiency","excitement","extent","feedback","guitar","homework","leader","mom","outcome","permission","presentation","promotion","reflection","refrigerator","resolution","revenue","session","singer","tennis","basket","bonus","cabinet","childhood","church","clothes","coffee","dinner","drawing","hair","hearing","initiative","judgment","lab","measurement","mode","mud","orange","poetry","police","possibility","procedure","queen","ratio","relation","restaurant","satisfaction","sector","signature","significance","song","tooth","town","vehicle","volume","wife","accident","airport","appointment","arrival","assumption","baseball","chapter","committee","conversation","database","enthusiasm","error","explanation","farmer","gate","girl","hall","historian","hospital","injury","instruction","maintenance","manufacturer","meal","perception","pie","poem","presence","proposal","reception","replacement","revolution","river","son","speech","tea","village","warning","winner","worker","writer","assistance","breath","buyer","chest","chocolate","conclusion","contribution","cookie","courage","desk","drawer","establishment","examination","garbage","grocery","honey","impression","improvement","independence","insect","inspection","inspector","king","ladder","menu","penalty","piano","potato","profession","professor","quantity","reaction","requirement","salad","sister","supermarket","tongue","weakness","wedding","affair","ambition","analyst","apple","assignment","assistant","bathroom","bedroom","beer","birthday","celebration","championship","cheek","client","consequence","departure","diamond","dirt","ear","fortune","friendship","funeral","gene","girlfriend","hat","indication","intention","lady","midnight","negotiation","obligation","passenger","pizza","platform","poet","pollution","recognition","reputation","shirt","speaker","stranger","surgery","sympathy","tale","throat","trainer","uncle","youth","time","work","film","water","money","example","while","business","study","game","life","form","air","day","place","number","part","field","fish","back","process","heat","hand","experience","job","book","end","point","type","home","economy","value","body","market","guide","interest","state","radio","course","company","price","size","card","list","mind","trade","line","care","group","risk","word","fat","force","key","light","training","name","school","top","amount","level","order","practice","research","sense","service","piece","web","boss","sport","fun","house","page","term","test","answer","sound","focus","matter","kind","soil","board","oil","picture","access","garden","range","rate","reason","future","site","demand","exercise","image","case","cause","coast","action","age","bad","boat","record","result","section","building","mouse","cash","class","period","plan","store","tax","side","subject","space","rule","stock","weather","chance","figure","man","model","source","beginning","earth","program","chicken","design","feature","head","material","purpose","question","rock","salt","act","birth","car","dog","object","scale","sun","note","profit","rent","speed","style","war","bank","craft","half","inside","outside","standard","bus","exchange","eye","fire","position","pressure","stress","advantage","benefit","box","frame","issue","step","cycle","face","item","metal","paint","review","room","screen","structure","view","account","ball","discipline","medium","share","balance","bit","black","bottom","choice","gift","impact","machine","shape","tool","wind","address","average","career","culture","morning","pot","sign","table","task","condition","contact","credit","egg","hope","ice","network","north","square","attempt","date","effect","link","post","star","voice","capital","challenge","friend","self","shot","brush","couple","exit","front","function","lack","living","plant","plastic","spot","summer","taste","theme","track","wing","brain","button","click","desire","foot","gas","influence","notice","rain","wall","base","damage","distance","feeling","pair","savings","staff","sugar","target","text","animal","author","budget","discount","file","ground","lesson","minute","officer","phase","reference","register","sky","stage","stick","title","trouble","bowl","bridge","campaign","character","club","edge","evidence","fan","letter","lock","maximum","novel","option","pack","park","quarter","skin","sort","weight","baby","background","carry","dish","factor","fruit","glass","joint","master","muscle","red","strength","traffic","trip","vegetable","appeal","chart","gear","ideal","kitchen","land","log","mother","net","party","principle","relative","sale","season","signal","spirit","street","tree","wave","belt","bench","commission","copy","drop","minimum","path","progress","project","sea","south","status","stuff","ticket","tour","angle","blue","breakfast","confidence","daughter","degree","doctor","dot","dream","duty","essay","father","fee","finance","hour","juice","luck","milk","mouth","peace","pipe","stable","storm","substance","team","trick","afternoon","bat","beach","blank","catch","chain","consideration","cream","crew","detail","gold","interview","kid","mark","mission","pain","pleasure","score","screw","sex","shop","shower","suit","tone","window","agent","band","bath","block","bone","calendar","candidate","cap","coat","contest","corner","court","cup","district","door","east","finger","garage","guarantee","hole","hook","implement","layer","lecture","lie","manner","meeting","nose","parking","partner","profile","rice","routine","schedule","swimming","telephone","tip","winter","airline","bag","battle","bed","bill","bother","cake","code","curve","designer","dimension","dress","ease","emergency","evening","extension","farm","fight","gap","grade","holiday","horror","horse","host","husband","loan","mistake","mountain","nail","noise","occasion","package","patient","pause","phrase","proof","race","relief","sand","sentence","shoulder","smoke","stomach","string","tourist","towel","vacation","west","wheel","wine","arm","aside","associate","bet","blow","border","branch","breast","brother","buddy","bunch","chip","coach","cross","document","draft","dust","expert","floor","god","golf","habit","iron","judge","knife","landscape","league","mail","mess","native","opening","parent","pattern","pin","pool","pound","request","salary","shame","shelter","shoe","silver","tackle","tank","trust","assist","bake","bar","bell","bike","blame","boy","brick","chair","closet","clue","collar","comment","conference","devil","diet","fear","fuel","glove","jacket","lunch","monitor","mortgage","nurse","pace","panic","peak","plane","reward","row","sandwich","shock","spite","spray","surprise","till","transition","weekend","welcome","yard","alarm","bend","bicycle","bite","blind","bottle","cable","candle","clerk","cloud","concert","counter","flower","grandfather","harm","knee","lawyer","leather","load","mirror","neck","pension","plate","purple","ruin","ship","skirt","slice","snow","specialist","stroke","switch","trash","tune","zone","anger","award","bid","bitter","boot","bug","camp","candy","carpet","cat","champion","channel","clock","comfort","cow","crack","engineer","entrance","fault","grass","guy","hell","highlight","incident","island","joke","jury","leg","lip","mate","motor","nerve","passage","pen","pride","priest","prize","promise","resident","resort","ring","roof","rope","sail","scheme","script","sock","station","toe","tower","truck","witness","can","will","other","use","make","good","look","help","go","great","being","still","public","read","keep","start","give","human","local","general","specific","long","play","feel","high","put","common","set","change","simple","past","big","possible","particular","major","personal","current","national","cut","natural","physical","show","try","check","second","call","move","pay","let","increase","single","individual","turn","ask","buy","guard","hold","main","offer","potential","professional","international","travel","cook","alternative","special","working","whole","dance","excuse","cold","commercial","low","purchase","deal","primary","worth","fall","necessary","positive","produce","search","present","spend","talk","creative","tell","cost","drive","green","support","glad","remove","return","run","complex","due","effective","middle","regular","reserve","independent","leave","original","reach","rest","serve","watch","beautiful","charge","active","break","negative","safe","stay","visit","visual","affect","cover","report","rise","walk","white","junior","pick","unique","classic","final","lift","mix","private","stop","teach","western","concern","familiar","fly","official","broad","comfortable","gain","rich","save","stand","young","heavy","lead","listen","valuable","worry","handle","leading","meet","release","sell","finish","normal","press","ride","secret","spread","spring","tough","wait","brown","deep","display","flow","hit","objective","shoot","touch","cancel","chemical","cry","dump","extreme","push","conflict","eat","fill","formal","jump","kick","opposite","pass","pitch","remote","total","treat","vast","abuse","beat","burn","deposit","print","raise","sleep","somewhere","advance","consist","dark","double","draw","equal","fix","hire","internal","join","kill","sensitive","tap","win","attack","claim","constant","drag","drink","guess","minor","pull","raw","soft","solid","wear","weird","wonder","annual","count","dead","doubt","feed","forever","impress","repeat","round","sing","slide","strip","wish","combine","command","dig","divide","equivalent","hang","hunt","initial","march","mention","spiritual","survey","tie","adult","brief","crazy","escape","gather","hate","prior","repair","rough","sad","scratch","sick","strike","employ","external","hurt","illegal","laugh","lay","mobile","nasty","ordinary","respond","royal","senior","split","strain","struggle","swim","train","upper","wash","yellow","convert","crash","dependent","fold","funny","grab","hide","miss","permit","quote","recover","resolve","roll","sink","slip","spare","suspect","sweet","swing","twist","upstairs","usual","abroad","brave","calm","concentrate","estimate","grand","male","mine","prompt","quiet","refuse","regret","reveal","rush","shake","shift","shine","steal","suck","surround","bear","brilliant","dare","dear","delay","drunk","female","hurry","inevitable","invite","kiss","neat","pop","punch","quit","reply","representative","resist","rip","rub","silly","smile","spell","stretch","stupid","tear","temporary","tomorrow","wake","wrap","yesterday","Thomas","Tom","Lieuwe"];

const canvas = document.getElementById("canvas");
const app = new PIXI.Application({
    width: WIDTH, height: HEIGHT,
    backgroundColor: 0x0000ff,
    resolution: window.devicePixelRatio || 1,
    view: canvas,
});

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST; 

const content = new PIXI.Container();
const graphics = new PIXI.Graphics();
app.stage.addChild(content);
content.addChild(graphics);

let objs = {};

let pause = false;

let all_dead = false;

class NN_Node {
    constructor(id="", ownernn="", fromnode=null) {
        this.id = id;
        this.ownernn = ownernn;

        this.targets = [];
        this.links = {};

        this.unweighted_value = 0; // [-inf, inf]
        this.value = 0; // [0, 1]

        this.weights = {};

        this.bias = 0;
        if (this.id[0] != "0") {
            this.bias = NNRandBias();
        }

        if (fromnode != null) {
            this.targets = fromnode.targets;
            this.links = JSON.parse(JSON.stringify(fromnode.links));
            this.weights = fromnode.weights;
            this.bias = fromnode.bias;
        }
    }

    LinkTarget(id) {
        // Point to target id.
        this.targets.push(id);
    }

    LinkSource(id) {
        // Receive from id.
        this.links[id] = 0;
        this.weights[id] = NNRandWeight();
    }

    Process() {
        if (this.id[0] == "0") { return; }
        this.unweighted_value = this.bias;
        for (let id in this.links) {
            this.unweighted_value += objs[this.ownernn].NodeAt(id).value * this.weights[id];
        }
        this.value = NNLimitFunc(this.unweighted_value);
    }

    ReceiveValFrom(v,id) {
        this.links[id] = v;
    }
}

class NN {
    constructor(x, y, id, name="", fromnn=null) {
        this.imgs = {};
        this.texts = {};

        this.name = name;
        if (this.name == "") {
            this.name = RandName();
        }

        this.active = false;

        this.id = id;
        this.x = x + 20;
        this.y = y + 20;

        this.node_rad = 14;
        this.x_spacing = 100;
        this.y_spacing = 30;
        this.font_size = 11;

        this.layers = [];
        this.heights = [];

        this.copied = false;

        if (fromnn == null) {
            // Not copying from a given node.

            this.nLayers = RandInt(N_LAYERS_MIN, N_LAYERS_MAX);

            // Create the network here.
            for (let layer = 0; layer < this.nLayers; layer++) {
                this.layers.push([]);
                if (layer == 0) { this.heights.push(N_INPUTS); }
                else if (layer == this.nLayers-1) { this.heights.push(2); }
                else { this.heights.push(RandInt(LAYER_HEIGHT_MIN, LAYER_HEIGHT_MAX+1)); }
                for (let node = 0; node < this.heights[layer]; node++) {
                    let id = "" + layer + node;
                    this.layers[layer].push(new NN_Node(id, this.id));
                }
            }

            // Link all nodes here.
            for (let layer = 0; layer < this.nLayers-1; layer++) {
                for (let node = 0; node < this.heights[layer]; node++) {
                    let source = this.layers[layer][node];
                    for (let i = 0; i < this.layers[layer+1].length; i++) {
                        let target = this.layers[layer+1][i];
                        source.LinkTarget(target.id);
                        target.LinkSource(source.id);
                    }
                }
            }

        } else {
            // Must copy from given node.

            this.nLayers = fromnn.nLayers;
            this.heights = fromnn.heights;

            this.name = RandName(fromnn.name.split(" ")[1]);

            this.copied = true;

            for (let l = 0; l < this.nLayers; l++) {
                this.layers.push([]);
                for (let n = 0; n < this.heights[l]; n++) {
                    let id = ""+l+n;
                    this.layers[l].push(new NN_Node(id, this.id, fromnn[id]));
                }
            }

        }

        // Add texts to all nodes.
        for (let l = 0; l < this.nLayers; l++) {
            for (let n = 0; n < this.heights[l]; n++) {
                let id = ""+l+n;

                this.texts[id] = new PIXI.Text("00.0", {
                    fontFamily: "Verdana", fontSize: this.font_size, fill: 0xffffff, align: "center",
                });
                this.texts[id].anchor.set(0.5, 0.5);
                this.texts[id].position.set(this.x + this.x_spacing*l, this.y + this.y_spacing*n);
                content.addChild(this.texts[id]);
            }
        }

        let final_layer = this.layers.length-1;
        this.final_nodes = [this.layers[final_layer][0], this.layers[final_layer][1]];
    }

    Encode() {
        let e = {};
        e.id = this.id;
        e.nLayers = this.nLayers;
        e.heights = this.heights;
        e.name = this.name;

        // Copy node information into e.
        for (let layer = 0; layer < this.nLayers; layer++) {
            for (let node = 0; node < this.heights[layer]; node++) {
                let nid = ""+layer+node;
                let n = this.layers[layer][node];
                e[nid] = {};
                e[nid].targets = n.targets;
                e[nid].links = n.links;
                e[nid].bias = n.bias;
                e[nid].weights = n.weights;
            }
        }

        return JSON.parse(JSON.stringify(e));
    }

    SetInputs(ins) {
        if (this.layers.length < 2) { return; }
        for (let i = 0; i < ins.length; i++) {
            this.layers[0][i].unweighted_value = ins[i];
            this.layers[0][i].value = ins[i];
        }
    }

    GetOutputs() {
        return [this.final_nodes[0].value, this.final_nodes[1].value];
    }

    NodeAt(id) {
        let layer = parseInt(id[0]);
        let node = parseInt(id[1]);
        return this.layers[layer][node];
    }

    Update(dT) {
        if (this.active == false) { return; }

        for (let layer = 0; layer < this.nLayers; layer++) {
            for (let node = 0; node < this.heights[layer]; node++) {
                this.layers[layer][node].Process();
            }
        }
    }

    Destroy() {
        for (let k in this.imgs) {
            content.removeChild(this.imgs[k]);
            this.imgs[k] = null;
        }
        for (let k in this.texts) {
            content.removeChild(this.texts[k]);
            this.texts[k] = null;
        }
    }

    Draw() {
        for (let l = 0; l < this.layers.length; l++) {
            for (let n = 0; n < this.layers[l].length; n++) {
                let x = this.x + l * this.x_spacing;
                let y = this.y + n * this.y_spacing;

                // First, draw links.
                for (let t = 0; t < this.layers[l][n].targets.length; t++) {
                    let id_l = parseInt(this.layers[l][n].targets[t][0]);
                    let id_n = parseInt(this.layers[l][n].targets[t][1]);
                    let weight = this.layers[id_l][id_n].weights[this.layers[l][n].id];
                    graphics.lineStyle(3,WeightToHex(weight));
                    graphics.moveTo(x,y);
                    graphics.lineTo(this.x + id_l*this.x_spacing, this.y + id_n*this.y_spacing);
                }

                // Then, draw node overtop.
                graphics.lineStyle(0,0);
                graphics.beginFill(WeightToHex(this.layers[l][n].value));
                graphics.arc(x, y, this.node_rad, 0, 2*PI);
                graphics.endFill();

                // Also, update text values.
                let id = ""+l+n;
                this.texts[id].text = ""+Sigs(this.layers[l][n].unweighted_value,1);
            }
        }
    }
}

class Game {
    constructor(id) {
        if (id == "0") {
            this.x = 0;
            this.y = 0;
        } else if (id == "1") {
            this.x = WIDTH/2;
            this.y = 0;
        } else if (id == "2") {
            this.x = 0;
            this.y = HEIGHT/2;
        } else if (id == "3") {
            this.x = WIDTH/2;
            this.y = HEIGHT/2;
        } else {
            console.log("ERR. Unknown Game id arg.");
            return;
        }

        this.id = id;

        this.nnid = "nn"+this.id;
        objs[this.nnid] = new NN(this.x, this.y, this.nnid);

        this.imgs = {};
        this.texts = {};

        this.active = false;

        this.tree_spawn = this.x + GAME_WIDTH*5/8;
        this.bird_spawn = this.x + ENTITY_SPAWN_POSITION;
        this.dino_spawn = this.x + GAME_WIDTH/4;
        this.max_separation = this.x + ENTITY_SPAWN_POSITION - this.dino_spawn;

        this.tree_speed = -8;

        this.score = 0;
        this.generation = 0;

        this.textures = {};
        this.textures.dino_regular = PIXI.Texture.from("images/dino.png");
        this.textures.dino_ducking = PIXI.Texture.from("images/dino_duck.png");

        this.imgs.dino = new PIXI.Sprite(this.textures.dino_regular);
        this.imgs.dino.anchor.set(0.5);
        this.imgs.dino.position.set(this.dino_spawn, this.y + LINE_HEIGHT);
        this.imgs.dino.width = 32;
        this.imgs.dino.height = 32;
        content.addChild(this.imgs.dino);

        this.imgs.tree = new PIXI.Sprite(PIXI.Texture.from("images/tree.png"));
        this.imgs.tree.anchor.set(0.5);
        this.imgs.tree.position.set(this.tree_spawn, this.y + LINE_HEIGHT);
        this.imgs.tree.width = TREE_SIZE;
        this.imgs.tree.height = TREE_SIZE;
        content.addChild(this.imgs.tree);

        this.imgs.bird = new PIXI.Sprite(PIXI.Texture.from("images/bird.png"));
        this.imgs.bird.anchor.set(0.5);
        this.imgs.bird.position.set(this.bird_spawn, this.y + LINE_HEIGHT - 8);
        this.imgs.bird.width = BIRD_SIZE;
        this.imgs.bird.height = BIRD_SIZE;
        this.imgs.bird.visible = false;
        content.addChild(this.imgs.bird);

        this.imgs.crown = new PIXI.Sprite(PIXI.Texture.from("images/crown.png"));
        this.imgs.crown.anchor.set(0.5);
        this.imgs.crown.position.set(this.x + GAME_WIDTH-40, this.y + 40);
        this.imgs.crown.width = 32;
        this.imgs.crown.height = 32;
        this.imgs.crown.visible = false;
        content.addChild(this.imgs.crown);
        
        let scoreboard_x = 600;
        let scoreboard_y = 20;
        this.texts.lbl_score = new PIXI.Text("Score:", {
            fontFamily: "Verdana", fontSize: 24, fill: 0xffffff, align: "right",
        });
        this.texts.lbl_score.anchor.set(1,0.5);
        this.texts.lbl_score.position.set(this.x + scoreboard_x, this.y + scoreboard_y);
        content.addChild(this.texts.lbl_score);

        this.texts.score = new PIXI.Text("0", {
            fontFamily: "Verdana", fontSize: 24, fill: 0xffffff, align: "left",
        });
        this.texts.score.anchor.set(0,0.5);
        this.texts.score.position.set(this.x + scoreboard_x, this.y + scoreboard_y);
        content.addChild(this.texts.score);

        this.texts.lbl_gen = new PIXI.Text("Generation:", {
            fontFamily: "Verdana", fontSize: 24, fill:0xffffff, align: "right",
        });
        this.texts.lbl_gen.anchor.set(1,0.5);
        this.texts.lbl_gen.position.set(this.x + scoreboard_x, this.y + scoreboard_y+25);
        content.addChild(this.texts.lbl_gen);

        this.texts.gen = new PIXI.Text("0", {
            fontFamily: "Verdana", fontSize: 24, fill: 0xffffff, align: "left",
        });
        this.texts.gen.anchor.set(0,0.5);
        this.texts.gen.position.set(this.x + scoreboard_x, this.y + scoreboard_y+25);
        content.addChild(this.texts.gen);

        this.texts.lbl_name = new PIXI.Text("Name:", {
            fontFamily: "Verdana", fontSize: 12, fill: 0xffffff, align: "right",
        });
        this.texts.lbl_name.anchor.set(1, 0.5);
        this.texts.lbl_name.position.set(this.x + scoreboard_x, this.y + scoreboard_y+50);
        content.addChild(this.texts.lbl_name);

        this.texts.name = new PIXI.Text(objs[this.nnid].name, {
            fontFamily: "Verdana", fontSize: 12, fill: 0xffffff, align: "left",
        });
        this.texts.name.anchor.set(0,0.5);
        this.texts.name.position.set(this.x + scoreboard_x, this.y + scoreboard_y+50);
        content.addChild(this.texts.name);

        this.action_up = false;
        this.action_down = false;

        this.dino_state = "standing"; // one of "standing", "ducking", or "jumping".
        this.dino_vely = 0;
        this.dino_jump_time = 0;
        this.dino_jump_duration = 200;

        this.bird_active = false;
        this.bird_avg_speed = -10;
        this.bird_speed = -10;
    }

    SetWinner(b) {
        this.imgs.crown.visible = b;
    }

    Reset(leader) {
        this.imgs.dino.texture = this.textures.dino_regular;
        this.dino_state = "standing";
        this.dino_vely = 0;

        this.imgs.tree.x = this.tree_spawn;
        this.imgs.bird.x = this.bird_spawn;
        this.imgs.dino.y = this.y + LINE_HEIGHT;

        this.action_up = false;
        this.action_down = false;

        this.score = 0;
        this.generation++;

        this.tree_speed = -8;

        this.bird_active = false;
        this.bird_avg_speed = -10;
        this.bird_speed = -10;

        // If this nn is not the leader, create new.
        if (leader.id != this.nnid) {
            objs[this.nnid].Destroy();
            objs[this.nnid] = new NN(this.x, this.y, this.nnid, this.name, 
                NNMutate(leader, 0.5, 0.5, 0.3, 0.1));
        }
        objs[this.nnid].active = true;
        this.texts.name.text = objs[this.nnid].name;

        this.active = true;
        this.imgs.crown.visible = leader.id == this.nnid;
    }

    DinoJump() {
        this.dino_state = "jumping";
        this.dino_vely = -6;
        this.imgs.dino.y -= 4;
        this.dino_jump_time = Date.now();
    }

    DinoStateVal() {
        if (this.dino_state == "standing") { return 0.5; }
        if (this.dino_state == "ducking") { return 0; }
        if (this.dino_state == "jumping") { return 1; }
        return -1;
    }

    Update(dT) {
        if (this.active == false) { return; }

        this.score += dT * -this.tree_speed / 100.0;
        this.texts.score.text = ""+parseInt(this.score);
        this.texts.gen.text = ""+parseInt(this.generation);

        // Move bird (if active).
        if (this.bird_active) {
            this.imgs.bird.position.x += this.bird_speed * dT;
            this.bird_avg_speed -= 0.001 * dT;
        } else {
            this.bird_active = this.score > BIRD_SPAWN_SCORE;
        }

        // Handle bird level boundary.
        if (this.imgs.bird.x < this.x + ENTITY_LEFT_BOUND) {
            this.imgs.bird.x = this.x + ENTITY_SPAWN_POSITION;
            let fac = (Math.random()*0.2) + 0.9; // [0.9, 1.1]
            this.bird_speed = this.bird_avg_speed * fac;
        } 
        this.imgs.bird.visible = this.imgs.bird.x < this.x + GAME_WIDTH && this.imgs.bird.x > this.x;

        // Move tree.
        this.imgs.tree.x += this.tree_speed * dT;
        this.tree_speed -= 0.001 * dT; // Acceleration over time.

        // Handle tree level boundary.
        if (this.imgs.tree.x < this.x + ENTITY_LEFT_BOUND) {
            this.imgs.tree.x = this.x + ENTITY_SPAWN_POSITION;
        }
        this.imgs.tree.visible = this.imgs.tree.x < this.x + GAME_WIDTH && this.imgs.tree.x > this.x;

        // Measure how far the nearest tree is.
        let inputs = [];
        let dist = 0;
        // Input 0 = Tree distance.
        dist = this.imgs.tree.x - this.imgs.dino.x;
        if (dist < 0) { dist = this.max_separation; }
        inputs.push(Clamp(dist / this.max_separation, 0, 1));
        // Input 1 = Bird distance.
        dist = this.imgs.bird.x - this.imgs.dino.x;
        if (dist < 0) { dist = this.max_separation; }
        inputs.push(Clamp(dist / this.max_separation, 0, 1));
        // Input 2 = Dino state.
        inputs.push(this.DinoStateVal());
        // Input 3 = Tree speed.
        inputs.push(this.tree_speed);
        // Input 4 = Bird speed.
        inputs.push(this.bird_speed);

        objs[this.nnid].SetInputs(inputs);
        objs[this.nnid].Update(dT);

        if (objs[this.nnid].active) {
            let outputs = objs[this.nnid].GetOutputs();

            this.action_up = outputs[0] > 0.5;
            this.action_down = outputs[1] > 0.5;
        }

        // Check collision with tree.
        let tree_bounds = {left:0, right:0, top:0, bottom:0};
        tree_bounds.left = this.imgs.tree.x - this.imgs.tree.width/2;
        tree_bounds.right = this.imgs.tree.x + this.imgs.tree.width/2 + this.tree_speed*dT;
        tree_bounds.top = this.imgs.tree.y - this.imgs.tree.height/2;
        tree_bounds.bottom = this.imgs.tree.y + this.imgs.tree.height/2;

        if (this.imgs.dino.x > tree_bounds.left && this.imgs.dino.x < tree_bounds.right &&
                this.imgs.dino.y > tree_bounds.top && this.imgs.dino.y < tree_bounds.bottom) {
            // Lose.
            this.active = false;
            return;
        }

        // Check collision with bird.
        let bird_bounds = {left:0, right:0, top:0, bottom:0};
        bird_bounds.left = this.imgs.bird.x - this.imgs.bird.width/2;
        bird_bounds.right = this.imgs.bird.x + this.imgs.bird.width/2 + this.bird_speed*dT;
        bird_bounds.top = this.imgs.bird.y - this.imgs.bird.height/2;
        bird_bounds.bottom = this.imgs.bird.y + this.imgs.bird.height/2;

        let duck_offset = 0;
        if (this.dino_state == "ducking") { duck_offset = 10; }

        if (this.imgs.dino.x > bird_bounds.left && this.imgs.dino.x < bird_bounds.right &&
                this.imgs.dino.y + duck_offset > bird_bounds.top && 
                this.imgs.dino.y + duck_offset < bird_bounds.bottom) {
            // Lose.
            this.active = false;
            return;
        }

        // Dino state machine.
        if (this.dino_state == "standing") {
            // State = standing.

            if (this.action_up) {
                this.DinoJump();
            } else if (this.action_down) {
                this.dino_state = "ducking";
                this.imgs.dino.texture = this.textures.dino_ducking;
            }

        } else if (this.dino_state == "jumping") {
            // State = jumping.

            this.imgs.dino.y += this.dino_vely * dT;

            if (Date.now() - this.dino_jump_time < this.dino_jump_duration && this.action_up) {
            } else {
                this.dino_vely += 0.5;
            }

            if (this.action_down) {
                this.dino_vely += 0.3;
                this.imgs.dino.y += 1;
            }

            if (this.imgs.dino.y > this.y + LINE_HEIGHT) {
                this.imgs.dino.y = this.y + LINE_HEIGHT;
                this.dino_state = "standing";
            }

        } else if (this.dino_state == "ducking") {
            // State = ducking.

            if (this.action_up) {
                this.DinoJump();
                this.imgs.dino.texture = this.textures.dino_regular;
            } else if (this.action_down == false) {
                this.dino_state = "standing";
                this.imgs.dino.texture = this.textures.dino_regular;
            }
        }
    }

    Destroy() {
        for (let k in this.imgs) {
            content.removeChild(this.imgs[k]);
            this.imgs[k] = null;
        }
        for (let k in this.texts) {
            content.removeChild(this.texts[k]);
            this.texts[k] = null;
        }
    }

    Draw() {
        // Background.
        graphics.lineStyle(2,0xffffff);
        graphics.beginFill(0x000000);
        graphics.drawRect(this.x, this.y, GAME_WIDTH, GAME_HEIGHT);
        graphics.endFill();

        // Ground.
        graphics.lineStyle(2, 0x888888);
        graphics.beginFill(0x444444);
        graphics.drawRect(this.x, this.y + LINE_HEIGHT+20, GAME_WIDTH, GAME_HEIGHT-LINE_HEIGHT-20);
        graphics.endFill();

        // Vertical line for output display.
        let h_off = -100;
        graphics.moveTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 40);
        graphics.lineTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 80);

        // Arrow for up/down actions.
        if (this.action_up) {
            graphics.moveTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 80);
            graphics.lineTo(this.dino_spawn + h_off - 10, this.y + LINE_HEIGHT - 70);
            graphics.moveTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 80);
            graphics.lineTo(this.dino_spawn + h_off + 10, this.y + LINE_HEIGHT - 70);
        }
        if (this.action_down) {
            graphics.moveTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 40);
            graphics.lineTo(this.dino_spawn + h_off - 10, this.y + LINE_HEIGHT - 50);
            graphics.moveTo(this.dino_spawn + h_off, this.y + LINE_HEIGHT - 40);
            graphics.lineTo(this.dino_spawn + h_off + 10, this.y + LINE_HEIGHT - 50);
        }

        objs[this.nnid].Draw();
    }
}

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
    return Math.floor(Math.random() * (h-l)) + l;
}
function RandID(len=6) {
    let result           = '';
    let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
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

function WeightToHex(w) {
    if (w < -0.667) { return 0x100b59; }
    if (w < -0.333) { return 0x0b4659; }
    if (w < 0.333) { return 0x8c2323; }
    if (w < 0.667) { return 0x80740e; }
    return 0x0b5913;
}
function CapFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function RandName(last="") {
    if (last != "") {
        return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + ' ' + last;
    }
    return CapFirst(FIRST_NAMES[RandInt(0, FIRST_NAMES.length)]) + ' ' + 
        CapFirst(LAST_NAMES[RandInt(0, LAST_NAMES.length)]);
}
function NNLimitFunc(v) {
    return 1 / (1 + Math.exp(-v));
}
function NNRandWeight() {
    // Range of [-1, 1].
    return (Math.random()*2) - 1;
}
function NNRandBias() {
    // Range of [-0.2, 0.2].
    return (Math.random() * 0.4) - 0.2;
}
function NNMutate(e, wv=0.1, bv=0.1, nlcc=0.1, ldcc=0.1) {
    // @param wv: weight variance.
    // @param bv: bias variance.
    // @param nlcc: nLayers change chance.
    // @param ldcc: layer depth change chance.

    // TODO: change number of layers or height.
    // Here, check if number of layers should change in this mutation.
    // let nLayers = this.nLayers;
    if (Math.random() < nlcc) {
        return null;
    //     if (Math.random() > 0.5) {
    //         nLayers++;
    //     } else {
    //         nLayers--;
    //     }
    //     nLayers = Clamp(nLayers, 3, 5);
    }

    // // Here, check if number of nodes at some layer should change.
    // let newheight = 0;
    // if (Math.random() < nlcc) {
    //     if (Math.random() > 0.5) {
    //         nLayers++;
    //     } else {
    //         nLayers--;
    //     }
    //     nLayers = Clamp(nLayers, 3, 5);
    // }
 
    // Alter weights and bias with a normal distribution.
    for (let l = 0; l < N_LAYERS_MAX; l++) {
        for (let n = 0; n < LAYER_HEIGHT_MAX; n++) {
            let id = ""+l+n;
            if (id in e) {
                e[id].bias = RandNormal(e[id].bias, bv);
                for (let s in e[id].links) {
                    e[id].weights[s] = RandNormal(e[id].weights[s], wv);
                }
            }
        }
    }

    return e;
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

function Clamp(v, min, max) {
    if (v < min) { return min; }
    if (v > max) { return max; }
    return v;
}

let update = false;

function Init(){
    objs["game0"] = new Game("0");
    objs["game1"] = new Game("1");
    objs["game2"] = new Game("2");
    objs["game3"] = new Game("3");
}

function CheckGenerations() {
    if (objs["game0"].active == false &&
            objs["game1"].active == false &&
            objs["game2"].active == false &&
            objs["game3"].active == false &&
            all_dead == false) {

        // Remember that all population members have lost.
        all_dead = true;

        let wait_time = 1000;
        // In wait_time ms, start a new generation.
        setTimeout(function () {
            let g0s = objs["game0"].score;
            let g1s = objs["game1"].score;
            let g2s = objs["game2"].score;
            let g3s = objs["game3"].score;

            let leader = {};
            if (g0s > g1s && g0s > g2s && g0s > g3s) {
                leader = objs["nn0"].Encode();
            } else if (g1s > g0s && g1s > g2s && g1s > g3s) {
                leader = objs["nn1"].Encode();
            } else if (g2s > g1s && g2s > g0s && g2s > g3s) {
                leader = objs["nn2"].Encode();
            } else if (g3s > g1s && g3s > g2s && g3s > g0s) {
                leader = objs["nn3"].Encode();
            } else {
                let max = g0s;
                if (g1s > max) { max = g1s; }
                else if (g2s > max) { max = g2s; }
                else if (g3s > max) { max = g3s; }

                if (g0s >= max) {
                    leader = objs["nn0"].Encode();
                } else if (g1s >= max) {
                    leader = objs["nn1"].Encode();
                } else if (g2s >= max) {
                    leader = objs["nn2"].Encode();
                } else {
                    leader = objs["nn3"].Encode();
                }
            }

            objs["game0"].Reset(leader);
            objs["game1"].Reset(leader);
            objs["game2"].Reset(leader);
            objs["game3"].Reset(leader);

            all_dead = false;
        }, wait_time);
    }
}

app.ticker.add((dT) => {
    if (pause) { return; }

    graphics.clear();

    objs["game0"].Update(dT);
    objs["game1"].Update(dT);
    objs["game2"].Update(dT);
    objs["game3"].Update(dT);

    objs["game0"].Draw();
    objs["game1"].Draw();
    objs["game2"].Draw();
    objs["game3"].Draw();

    CheckGenerations();
});

document.addEventListener("keydown", function(evt) {
    if (evt.key == 'n') {
        // Key: 'n'
        // Action: Reset games.

        objs["game0"].Reset();
        objs["game1"].Reset();
        objs["game2"].Reset();
        objs["game3"].Reset();

    } else if (evt.key == 'b') {

        pause = !pause;

    } else if (evt.key == 'm') {
        // Key: 'm'
        // Action: Debug.

        // console.log(objs["nn1"].texts);

    }
}, false);

document.addEventListener("keyup", function(evt) {
}, false);

Init();
