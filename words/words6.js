// 词库数据 6：现代生活实用分类（2026-09-21 扩充）
// 以后想再加词汇：照下面格式往这个文件里 push 新分类即可，然后运行 node build-ipa.js 重新生成音标
window.WORD_DATA = window.WORD_DATA || { categories: [], phonics: [] };
WORD_DATA.categories.push(
{ name: "手机应用", en: "Smartphone & Apps", words: [
["smartphone","智能手机"],["cellphone","手机"],["screen","屏幕"],["touchscreen","触摸屏"],["battery","电池"],
["charger","充电器"],["charging cable","充电线"],["power bank","充电宝"],["app","应用"],["download","下载"],
["upload","上传"],["update","更新"],["settings","设置"],["Wi-Fi","无线网络"],["password","密码"],
["fingerprint","指纹"],["face ID","人脸识别"],["camera","相机"],["selfie","自拍"],["photo album","相册"],
["message","消息"],["notification","通知"],["ringtone","铃声"],["volume","音量"],["Bluetooth","蓝牙"],
["hotspot","热点"],["data plan","流量套餐"],["signal","信号"],["screenshot","截图"],["keyboard","键盘"],
["emoji","表情符号"],["contact","联系人"],["SIM card","手机卡"],["storage","存储空间"],["backup","备份"],
["restart","重启"],["mute","静音"],["speaker","扬声器"],["microphone","麦克风"],["flashlight","手电筒"],
["calculator","计算器"],["alarm clock","闹钟"],["scan","扫一扫"],["QR code","二维码"],["browser","浏览器"]
]},
{ name: "移动支付", en: "Mobile Payment", words: [
["payment","支付"],["mobile payment","移动支付"],["scan the code","扫码"],["barcode","条形码"],["transfer","转账"],
["receive money","收钱"],["send money","转钱"],["red packet","红包"],["balance","余额"],["debit card","借记卡"],
["credit card","信用卡"],["bank card","银行卡"],["PIN code","支付密码"],["fingerprint pay","指纹支付"],["face pay","刷脸支付"],
["Alipay","支付宝"],["WeChat Pay","微信支付"],["Apple Pay","苹果支付"],["e-wallet","电子钱包"],["receipt","小票/收据"],
["refund","退款"],["discount","折扣"],["coupon","优惠券"],["membership","会员"],["points","积分"],
["invoice","发票"],["charge","收费"],["fee","手续费"],["pay the bill","买单"],["split the bill","AA制分账"],
["delivery fee","配送费"],["deposit","押金"],["free of charge","免费"],["checkout","结账"],["cashier","收银员"]
]},
{ name: "快递外卖", en: "Delivery & Takeout", words: [
["package","包裹"],["parcel","邮包"],["delivery","配送"],["deliveryman","快递员"],["courier","快递公司"],
["express","快递"],["tracking number","单号"],["shipping","运输"],["sender","寄件人"],["recipient","收件人"],
["address","地址"],["zip code","邮编"],["mailbox","邮箱"],["sign for","签收"],["pickup","取件"],
["return","退货"],["exchange","换货"],["fragile","易碎品"],["takeout","外卖"],["place an order","下单"],
["estimated time","预计时间"],["rider","骑手"],["review","评价"],["five stars","五星"],["customer service","客服"],
["doorstep","门口"],["locker","快递柜"],["pickup code","取件码"],["cash on delivery","货到付款"],["lost package","包裹丢失"],
["complaint","投诉"],["shipping fee","运费"],["free shipping","包邮"],["dispatch","发货"],["in transit","运输中"]
]},
{ name: "常见症状", en: "Symptoms", words: [
["fever","发烧"],["cough","咳嗽"],["cold","感冒"],["flu","流感"],["headache","头痛"],
["toothache","牙痛"],["stomachache","胃痛/肚子痛"],["sore throat","嗓子痛"],["runny nose","流鼻涕"],["stuffy nose","鼻塞"],
["sneeze","打喷嚏"],["dizzy","头晕"],["nausea","恶心"],["vomit","呕吐"],["diarrhea","腹泻"],
["constipation","便秘"],["allergy","过敏"],["rash","皮疹"],["itch","痒"],["pain","疼痛"],
["cramp","抽筋"],["swollen","肿的"],["bruise","淤青"],["wound","伤口"],["bleeding","出血"],
["burn","烫伤"],["sprain","扭伤"],["fracture","骨折"],["insomnia","失眠"],["chill","发冷"],
["sweat","出汗"],["blood pressure","血压"],["blood sugar","血糖"],["temperature","体温"],["symptom","症状"]
]},
{ name: "药店买药", en: "Pharmacy", words: [
["pharmacy","药房"],["drugstore","药店"],["medicine","药"],["pill","药片"],["tablet","药片"],
["capsule","胶囊"],["syrup","糖浆"],["ointment","药膏"],["bandage","绷带"],["Band-Aid","创可贴"],
["gauze","纱布"],["thermometer","体温计"],["vitamin","维生素"],["painkiller","止痛药"],["antibiotic","抗生素"],
["prescription","处方"],["over the counter","非处方药"],["dosage","剂量"],["side effect","副作用"],["expiry date","有效期"],
["refill","续配药"],["pharmacist","药剂师"],["health insurance","医保"],["mask","口罩"],["disinfectant","消毒剂"],
["cotton swab","棉签"],["eye drops","眼药水"],["cough drops","润喉糖"],["spray","喷雾"],["cream","乳膏"],
["cold medicine","感冒药"],["sleeping pill","安眠药"],["first aid kit","急救箱"],["alcohol","酒精"],["lotion","乳液"]
]},
{ name: "加油停车", en: "Gas & Parking", words: [
["gas station","加油站"],["gasoline","汽油"],["diesel","柴油"],["fill up","加满"],["tank","油箱"],
["gallon","加仑"],["pump","油泵"],["nozzle","油枪"],["regular","普通汽油"],["premium","高级汽油"],
["car wash","洗车"],["tire pressure","胎压"],["oil change","换机油"],["parking lot","停车场"],["parking space","车位"],
["parking fee","停车费"],["parking ticket","违停罚单"],["meter","计时器"],["garage","车库"],["valet","代客泊车"],
["tow","拖车"],["fine","罚款"],["no parking","禁止停车"],["handicap spot","残疾人车位"],["EV charger","充电桩"],
["charging station","充电站"],["attendant","管理员"],["full tank","满箱"],["windshield","挡风玻璃"],["wiper","雨刮器"],
["entrance","入口"],["exit","出口"],["pay by plate","按车牌付费"],["gas price","油价"],["unleaded","无铅汽油"]
]},
{ name: "咖啡店", en: "Coffee Shop", words: [
["coffee","咖啡"],["espresso","浓缩咖啡"],["latte","拿铁"],["cappuccino","卡布奇诺"],["mocha","摩卡"],
["americano","美式咖啡"],["macchiato","玛奇朵"],["flat white","馥芮白"],["iced coffee","冰咖啡"],["cold brew","冷萃"],
["decaf","低因咖啡"],["black coffee","黑咖啡"],["whole milk","全脂牛奶"],["skim milk","脱脂牛奶"],["oat milk","燕麦奶"],
["soy milk","豆奶"],["cream","奶油"],["syrup","糖浆"],["caramel","焦糖"],["vanilla","香草"],
["whipped cream","打发奶油"],["lid","杯盖"],["straw","吸管"],["napkin","餐巾纸"],["for here","堂食"],
["to go","外带"],["barista","咖啡师"],["tip jar","小费罐"],["pastry","酥皮点心"],["muffin","玛芬"],
["croissant","可颂"],["bagel","贝果"],["cookie","曲奇"],["small","小杯"],["medium","中杯"],
["large","大杯"],["extra shot","加一份浓缩"],["less sugar","少糖"],["no ice","去冰"],["refill","续杯"]
]},
{ name: "常见标识", en: "Signs", words: [
["no entry","禁止入内"],["no smoking","禁止吸烟"],["restroom","洗手间"],["wheelchair accessible","无障碍通道"],["elevator","电梯"],
["stairs","楼梯"],["emergency exit","紧急出口"],["fire extinguisher","灭火器"],["caution","小心"],["wet floor","小心地滑"],
["danger","危险"],["warning","警告"],["keep out","请勿靠近"],["private property","私人领地"],["open","营业中"],
["closed","已关门"],["out of order","故障停用"],["push","推"],["pull","拉"],["yield","让行"],
["one way","单行道"],["speed limit","限速"],["crosswalk","人行横道"],["school zone","学校区域"],["do not disturb","请勿打扰"],
["staff only","员工专用"],["information","咨询处"],["lost and found","失物招领"],["first aid","急救点"],["quiet please","请保持安静"],
["no photos","禁止拍照"],["no pets","禁止宠物"],["free Wi-Fi","免费无线网"],["check-in","办理登机/入住"],["check-out","退房/结账离开"]
]},
{ name: "疑问词", en: "Question Words", words: [
["what","什么"],["who","谁"],["whose","谁的"],["whom","谁（宾格）"],["when","什么时候"],
["where","哪里"],["why","为什么"],["how","怎么/怎样"],["which","哪一个"],["how much","多少（钱）"],
["how many","多少个"],["how old","多大年纪"],["how long","多长时间"],["how often","多久一次"],["how far","多远"],
["what time","几点"],["what color","什么颜色"],["what kind","哪种"],["how about","……怎么样"],["what about","……呢"]
]},
{ name: "月份星期", en: "Months & Weekdays", words: [
["January","一月"],["February","二月"],["March","三月"],["April","四月"],["May","五月"],
["June","六月"],["July","七月"],["August","八月"],["September","九月"],["October","十月"],
["November","十一月"],["December","十二月"],["Monday","星期一"],["Tuesday","星期二"],["Wednesday","星期三"],
["Thursday","星期四"],["Friday","星期五"],["Saturday","星期六"],["Sunday","星期日"],["weekend","周末"],
["weekday","工作日"],["today","今天"],["tomorrow","明天"],["yesterday","昨天"],["day after tomorrow","后天"],
["day before yesterday","前天"],["this week","这周"],["next week","下周"],["last week","上周"],["every day","每天"]
]},
{ name: "美国城市", en: "US Cities", words: [
["New York","纽约"],["Los Angeles","洛杉矶"],["Chicago","芝加哥"],["Houston","休斯敦"],["Phoenix","菲尼克斯"],
["Philadelphia","费城"],["San Diego","圣地亚哥"],["Dallas","达拉斯"],["San Francisco","旧金山"],["Seattle","西雅图"],
["Boston","波士顿"],["Miami","迈阿密"],["Las Vegas","拉斯维加斯"],["Denver","丹佛"],["Atlanta","亚特兰大"],
["Washington D.C.","华盛顿"],["Portland","波特兰"],["Orlando","奥兰多"],["New Orleans","新奥尔良"],["Nashville","纳什维尔"],
["Austin","奥斯汀"],["Honolulu","檀香山"],["Salt Lake City","盐湖城"],["Minneapolis","明尼阿波利斯"],["Detroit","底特律"],
["Baltimore","巴尔的摩"],["Sacramento","萨克拉门托"],["San Jose","圣何塞"],["Anchorage","安克雷奇"],["Hollywood","好莱坞"]
]},
{ name: "公园户外", en: "Park & Outdoors", words: [
["park","公园"],["playground","游乐场"],["swing","秋千"],["slide","滑梯"],["seesaw","跷跷板"],
["bench","长椅"],["fountain","喷泉"],["pond","池塘"],["duck","鸭子"],["squirrel","松鼠"],
["lawn","草坪"],["trail","小径"],["picnic","野餐"],["barbecue","烧烤"],["kite","风筝"],
["frisbee","飞盘"],["dog park","狗狗公园"],["trash can","垃圾桶"],["recycling","可回收物"],["campground","营地"],
["flower bed","花坛"],["shade","树荫"],["fence","栅栏"],["gate","大门"],["bike path","自行车道"],
["jogging","慢跑"],["walk the dog","遛狗"],["stroller","婴儿车"],["skateboard","滑板"],["rest area","休息区"]
]},
{ name: "海滩度假", en: "Beach Vacation", words: [
["beach","海滩"],["ocean","大海"],["wave","海浪"],["tide","潮汐"],["seashell","贝壳"],
["seagull","海鸥"],["sunscreen","防晒霜"],["sunglasses","太阳镜"],["swimsuit","泳衣"],["swim trunks","泳裤"],
["beach umbrella","沙滩伞"],["beach chair","沙滩椅"],["surfboard","冲浪板"],["surf","冲浪"],["snorkel","浮潜"],
["lifeguard","救生员"],["beach ball","沙滩球"],["cooler","保温箱"],["sandcastle","沙堡"],["jellyfish","水母"],
["crab","螃蟹"],["dolphin","海豚"],["whale","鲸鱼"],["island","岛屿"],["coast","海岸"],
["shore","岸边"],["pier","码头"],["lighthouse","灯塔"],["sailboat","帆船"],["yacht","游艇"],
["sunset","日落"],["resort","度假村"],["dive","潜水"],["seaweed","海草"],["coral reef","珊瑚礁"]
]},
{ name: "露营徒步", en: "Camping & Hiking", words: [
["camping","露营"],["tent","帐篷"],["sleeping bag","睡袋"],["backpack","背包"],["hiking","徒步"],
["mountain","山"],["forest","森林"],["campfire","篝火"],["firewood","柴火"],["match","火柴"],
["lighter","打火机"],["lantern","营地灯"],["compass","指南针"],["water bottle","水壶"],["thermos","保温壶"],
["folding chair","折叠椅"],["picnic table","野餐桌"],["campsite","营位"],["RV","房车"],["trailer","拖车"],
["mosquito","蚊子"],["insect repellent","驱蚊水"],["pocket knife","折叠刀"],["rope","绳子"],["binoculars","望远镜"],
["wildlife","野生动物"],["bear","熊"],["deer","鹿"],["ranger","护林员"],["permit","许可证"],
["stargazing","看星星"],["trailhead","步道起点"],["summit","山顶"],["valley","山谷"],["stream","小溪"]
]},
{ name: "宠物相关", en: "Pets", words: [
["pet","宠物"],["puppy","小狗"],["kitten","小猫"],["leash","牵引绳"],["collar","项圈"],
["harness","胸背带"],["pet food","宠物粮"],["treat","零食"],["food bowl","食盆"],["water bowl","水盆"],
["vet","兽医"],["vaccine","疫苗"],["grooming","美容洗护"],["nail clipper","指甲剪"],["litter box","猫砂盆"],
["cat litter","猫砂"],["cage","笼子"],["aquarium","鱼缸"],["goldfish","金鱼"],["parrot","鹦鹉"],
["hamster","仓鼠"],["rabbit","兔子"],["turtle","乌龟"],["poop","便便"],["pee","尿尿"],
["pet store","宠物店"],["adoption","领养"],["stray","流浪动物"],["breed","品种"],["bark","吠叫"],
["meow","喵叫"],["wag tail","摇尾巴"],["fetch","捡球游戏"],["obedience","服从训练"],["microchip","芯片"]
]},
{ name: "理发美容", en: "Hair & Beauty", words: [
["barbershop","理发店"],["hair salon","美发沙龙"],["haircut","理发"],["hairstyle","发型"],["bangs","刘海"],
["trim","修剪"],["shave","刮胡子"],["beard","胡须"],["mustache","八字胡"],["razor","剃刀"],
["comb","梳子"],["hair dryer","吹风机"],["conditioner","护发素"],["dye","染发"],["highlights","挑染"],
["perm","烫发"],["straighten","拉直"],["curl","卷发"],["bald","秃头"],["wig","假发"],
["barber","理发师"],["stylist","造型师"],["appointment","预约"],["walk-in","直接到店"],["clipper","电推剪"],
["gel","发胶"],["manicure","美甲"],["pedicure","足部护理"],["facial","面部护理"],["massage","按摩"],
["eyebrow","眉毛"],["skincare","护肤"],["mirror","镜子"],["sideburns","鬓角"],["thinning","打薄"]
]},
{ name: "洗衣干洗", en: "Laundry", words: [
["laundry","洗衣"],["washing machine","洗衣机"],["dryer","烘干机"],["detergent","洗衣液"],["fabric softener","柔顺剂"],
["bleach","漂白剂"],["stain","污渍"],["stain remover","去渍剂"],["laundry basket","洗衣篮"],["clothesline","晾衣绳"],
["clothespin","衣夹"],["hanger","衣架"],["iron","熨斗"],["ironing board","熨衣板"],["dry cleaning","干洗"],
["dry cleaner","干洗店"],["laundromat","自助洗衣店"],["wash cycle","洗涤模式"],["rinse","漂洗"],["spin","甩干"],
["load","一缸衣服"],["delicate","轻柔洗"],["hand wash","手洗"],["shrink","缩水"],["fade","褪色"],
["wrinkle","褶皱"],["fold","叠衣服"],["underwear","内衣"],["sheet","床单"],["lint","绒毛"],
["coin laundry","投币洗衣"],["air dry","晾干"],["tumble dry","烘干"],["soak","浸泡"],["prewash","预洗"]
]},
{ name: "健身锻炼", en: "Gym & Fitness", words: [
["gym","健身房"],["fitness","健身"],["workout","锻炼"],["exercise","运动"],["treadmill","跑步机"],
["elliptical","椭圆机"],["dumbbell","哑铃"],["barbell","杠铃"],["weight","重量"],["bench press","卧推"],
["squat","深蹲"],["push-up","俯卧撑"],["sit-up","仰卧起坐"],["pull-up","引体向上"],["plank","平板支撑"],
["stretch","拉伸"],["warm-up","热身"],["yoga","瑜伽"],["cardio","有氧运动"],["strength","力量"],
["muscle","肌肉"],["trainer","教练"],["membership","会员卡"],["locker room","更衣室"],["protein","蛋白质"],
["heart rate","心率"],["calories","卡路里"],["reps","次数"],["sets","组数"],["resistance band","弹力带"],
["jump rope","跳绳"],["sauna","桑拿"],["shower","淋浴"],["sweat","出汗"],["personal trainer","私人教练"]
]},
{ name: "房屋维修", en: "Home Repair", words: [
["repair","修理"],["fix","修好"],["broken","坏了"],["leak","漏水"],["leaky faucet","漏水龙头"],
["plumber","水管工"],["plumbing","管道"],["electrician","电工"],["wiring","线路"],["outlet","插座"],
["switch","开关"],["light bulb","灯泡"],["fuse","保险丝"],["circuit breaker","断路器"],["drill","电钻"],
["screwdriver","螺丝刀"],["hammer","锤子"],["nail","钉子"],["screw","螺丝"],["wrench","扳手"],
["pliers","钳子"],["saw","锯子"],["ladder","梯子"],["toolbox","工具箱"],["paintbrush","油漆刷"],
["roller","滚筒刷"],["tape","胶带"],["glue","胶水"],["caulk","填缝剂"],["tile","瓷砖"],
["ceiling","天花板"],["roof","屋顶"],["gutter","排水沟"],["heater","暖气"],["filter","滤网"],
["handyman","维修工"],["air conditioning","空调"],["clogged","堵住的"],["drain","下水道"],["shut off valve","总阀门"]
]},
{ name: "电话沟通", en: "Phone Calls", words: [
["phone call","电话"],["dial","拨号"],["answer","接听"],["hang up","挂断"],["hold on","稍等"],
["busy","占线"],["voicemail","语音信箱"],["leave a message","留言"],["call back","回电话"],["missed call","未接来电"],
["speakerphone","免提"],["conference call","电话会议"],["area code","区号"],["phone number","电话号码"],["wrong number","打错了"],
["connection","通话连接"],["static","杂音"],["can you hear me","听得到吗"],["speak up","说大声点"],["repeat","重复一遍"],
["pardon","请再说一遍"],["operator","接线员"],["extension","分机"],["toll-free","免费电话"],["long distance","长途"],
["international call","国际长途"],["text message","短信"],["ring","铃响"],["hang on","等一下"],["redial","重拨"]
]}
);
