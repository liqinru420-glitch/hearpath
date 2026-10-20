/* HearPath｜听见成长 — 0至14岁适龄问卷与健康史
 * 非临床筛查/诊断工具。输入只在当前页面内存处理；不联网提交、不存储。
 * 题目参照 ASHA/CDC 等公共资料中的观察领域重新编写，并非原机构量表。
 * 具体适龄性与规则仍须听力学/儿科专业人员审核后才能对公众提供服务。
 */
'use strict';

const RESPONSE = ['经常','有时','很少','不确定'];
const DIFFICULTY = ['经常','偶尔','很少','不确定'];
const CHANGES = ['突然明显变差','逐渐变差','没有明显变化','不确定'];
const EAR_OPTIONS = ['曾反复被诊断中耳炎或耳部积液','近期有耳痛或耳部流液','没有上述已知情况','不清楚'];
// 仅用于就医背景整理。主动允许跳过敏感信息；感染≠孩子已感染，病史≠疾病诊断。
const HX_ACTIVE = a => a.hxEntry === '愿意补充已知健康史';
const HX_PRENATAL = a => HX_ACTIVE(a) && ['医院检查确认','医生怀疑或建议进一步检查'].includes(a.pregInfection);
const HX_NICU = a => HX_ACTIVE(a) && a.nicu === '是';
const HX_JAUNDICE = a => HX_ACTIVE(a) && a.jaundice === '是';
const HX_NONE_OPTIONS = ['没有上述已知情况','不清楚'];
const HX_PRENATAL_TYPES = ['巨细胞病毒（CMV）','风疹','梅毒','弓形虫','其他经医生提示的感染','不清楚具体类型'];
const HX_PRIOR = [
  '曾经医生确诊脑膜炎',
  '曾因明显头部外伤住院',
  '医生告知存在耳廓或耳道结构异常',
  '医生告知有可能影响听力的药物治疗史',
  ...HX_NONE_OPTIONS
];
const q = (id, category, text, options, help='', more={}) => ({id,category,text,options,help,...more});
const ageQ = (options) => q('age','基本信息','孩子现在处于哪个年龄范围？',options,'年龄区间按已满月龄或周岁划分；满6个月归入6—12个月，满14岁仍在12—14岁组。');
const neonatal = () => [
  q('screening','出生后听力筛查','孩子的新生儿听力筛查情况是？',['已通过','未通过','没有筛查','不清楚'],'未通过不等于确诊；是否及时完成后续专业评估很重要。'),
  q('followup','听力筛查随访','筛查未通过后，是否完成过专业听力评估？',['已完成，未提示进一步异常','已完成，但医生建议继续复查','尚未完成','不清楚'],'如果尚未完成或不了解结果，建议尽快核实。',{when:a=>a.screening==='未通过'})
];
const hearingCheck = () => [
  q('screening','既往专业检查','孩子是否接受过医院的专业听力评估？',['接受过，未被告知异常','接受过，被建议复查','没有接受过','不清楚'],'婴儿时期筛查通过也不能排除日后出现的听力变化。')
];
// 通用题后追加可跳过的孕期、出生、童年病史，采用条件分支减少填写负担。
const healthHistoryQuestions = () => [
  q('hxEntry','可选 · 健康背景','您愿意补充孕期、出生及孩子既往的健康情况吗？',
    ['愿意补充已知健康史','暂时跳过'],
    '不知道的情况请选“不清楚”，无需回忆敏感细节。跳过不影响观察报告。'),
  q('pregInfection','孕期感染','怀孕期间，医生是否提到过可能影响胎儿健康的感染？',
    ['医院检查确认','医生怀疑或建议进一步检查','没有被告知','不清楚'],
    '普通发烧不等于确诊病毒感染；孕妇感染也不等于孩子患先天性感染。',{when:HX_ACTIVE}),
  q('pregTypes','孕期感染','医生提及过哪类感染？（可多选）',HX_PRENATAL_TYPES,
    '仅记录已经从产检资料或医生处了解到的信息，请勿自行推测。',{type:'multi',when:HX_PRENATAL}),
  q('pregTrimester','孕期感染','当时大约处于怀孕的哪个阶段？',
    ['孕早期','孕中期','孕晚期','不清楚'],
    '不记得月份可以选“不清楚”，是否与孩子有关需由医生评估。',{when:HX_PRENATAL}),
  q('premature','出生情况','孩子出生时是否早产（未满37周）？',['是','否','不清楚'],
    '早产本身不能用来判断孩子是否有听力障碍。',{when:HX_ACTIVE}),
  q('nicu','新生儿治疗','孩子出生后是否入住过新生儿重症监护室（NICU）？',['是','否','不清楚'],
    '如有，可优先核实出院记录。',{when:HX_ACTIVE}),
  q('nicuDuration','新生儿治疗','如果住过NICU，大约住了多久？',['1—4天','5天或更久','不清楚'],
    'NICU住院时间是提供给医生的背景信息，不是诊断结果。',{when:HX_NICU}),
  q('jaundice','新生儿黄疸','孩子出生后，医生是否告知曾有黄疸？',['是','否','不清楚'],
    '黄疸较常见，不能仅凭“有黄疸”判断听力是否受到影响。',{when:HX_ACTIVE}),
  q('jaundiceTreatment','新生儿黄疸','如果有黄疸，当时接受过什么处理？',
    ['观察或门诊随访','蓝光治疗','换血治疗','不清楚'],
    '“换血治疗”与普通黄疸随访不同；如不清楚，请依据出院记录核实。',{when:HX_JAUNDICE}),
  q('hemolysis','血液相关病史','医生是否明确告知孩子出生时发生过新生儿溶血？',
    ['是','否','不清楚'],
    '这里不是询问父母和孩子血型是否不同；血型不同不代表一定发生溶血。',{when:HX_ACTIVE}),
  q('birthOxygen','出生情况','医生是否告知出生时有缺氧缺血性脑病等需要随访的情况？',
    ['是','否','不清楚'],
    '仅询问已有诊断或医生明确提示；不需要根据生产经历猜测。',{when:HX_ACTIVE}),
  q('priorIllness','孩子既往情况','孩子过去是否有下列经医生告知的情况？（可多选）',HX_PRIOR,
    '相关既往病史可帮助医生了解背景，但不能确定听力损失类型或病因。',{type:'multi',when:HX_ACTIVE}),
  q('familyHearing','家族健康史','家族中是否有人从儿童时期开始出现听力损失？',
    ['有已知情况','没有已知情况','不清楚'],
    '若不便提供，请选“不清楚”；不应因家族史推断孩子患病。',{when:HX_ACTIVE})
];
const universal = (worryOptions) => [
  q('ear','耳部健康','孩子是否出现过以下经医生确认或家长观察到的耳部情况？',EAR_OPTIONS,'耳部感染与中耳积液有时会影响听觉，但需由医生检查。'),
  q('change','表现变化','与过去相比，孩子的听觉反应最近有什么变化？',CHANGES,'突然出现明显听力变化时应尽快联系医疗机构，不必继续等待问卷结果。'),
  ...healthHistoryQuestions(),
  q('worry','家长最关心的问题','您希望报告优先帮助了解什么？',worryOptions,'报告会据此整理就医问题和相关信息，不会给出疾病诊断。')
];
// 可选的情境观察：记录自然发生的交流，不是家庭听力筛查或声学检测。
// 距离、背景声和注意状态只是场景元数据，不换算分贝、疾病概率或听力损失级别。
const OBS_MODE = ['记录现在自然发生的一次交流','根据以往日常观察填写','暂时跳过'];
const OBS_ENABLED = a => a.obsMode && a.obsMode !== '暂时跳过';
const OBS_NOW = a => a.obsMode === '记录现在自然发生的一次交流';
function sceneQuestions(stage){
  const babyStage = stage==='infant' || stage==='baby';
  const olderStage = ['preschool','kindergarten','schoolYoung','schoolOlder','adolescent'].includes(stage);
  const help = babyStage
    ? '仅记录自然生活中的反应。不拍手、不用手机播放测试音、不突然制造巨响；没有观察到反应不代表没有听力。'
    : '可记录此刻自然发生的一次互动，或根据以往多次日常表现回答。不要反复呼唤、提高音量或用规定距离进行测试。';
  return [
    q('obsMode','可选 · 家庭情境观察','您希望补充一份日常交流情境记录吗？',OBS_MODE,help),
    q('obsSetting','情境背景','这次交流或您回忆的情境主要发生在哪里？',['安静的室内','有一些背景声音','较嘈杂的地方','记不清'],'环境条件只用于理解观察，不能据此判断听力损失。',{when:OBS_ENABLED}),
    ...(!babyStage ? [
      q('obsDistance','情境背景','当时您与孩子大约相距多远？',['约1米以内','约1—3米','超过3米','记不清'],'距离只是便于描述场景。家长声音大小与空间声学差异很大，不能根据米数推断听阈。',{when:OBS_ENABLED}),
      q('obsAttention','情境背景','孩子当时的注意状态更接近哪一种？',['正在与人交流','专心玩耍、学习或看屏幕','其他情况','记不清'],'没有回应也可能与注意、交流内容和场景有关。',{when:OBS_ENABLED}),
      q('obsVisual','情境背景','孩子当时能看到正在说话的人吗？',['能看到','没有面向说话者','记不清'],'记录是否存在视觉线索，有助于专业人员理解情境。',{when:OBS_ENABLED}),
      q('obsVolume','情境背景','说话者当时使用怎样的声音？',['与平时正常交谈相同','明显比平时更大声','记不清'],'无需为了本问卷改变音量；不要把大声呼唤后的回应当作听力正常依据。',{when:OBS_ENABLED}),
    ] : []),
    q('obsSingle','这次情境',babyStage?'在该自然情境下，您观察到孩子对熟悉人声或生活声音有何反应？':'在该自然交谈中，孩子对熟悉的呼唤或说话有什么反应？',
      babyStage?['有自然的注意、安静或表情反应','反应不太明确','没有观察到反应','记不清']
               :['自然地回应或交流','需要进一步解释或重复','没有观察到回应','记不清'],
      '单次反应仅作记录；不计算“通过次数”，也不能证明听力正常或异常。',{when:OBS_ENABLED}),
    q('obsPattern','平时的多次观察',babyStage?'平时多次自然交流中，您通常观察到怎样的声音反应？':'综合平时多次日常互动，孩子听到熟悉的人说话或呼唤时，通常怎样？',
      babyStage?['多次观察到自然声音反应','有时不容易确定反应','多次没有观察到明显反应','平时未留意']
               :['通常可以回应','有时需要重复或提醒','经常需要重复或回应少','平时未留意'],
      '比单次表现更值得记录的是反复发生的情况；如有担忧，请联系专业人员。',{when:OBS_ENABLED}),
    ...(!babyStage ? [q('obsUnderstand','日常语言理解','在熟悉的生活情境中，孩子通常能理解符合年龄的简单话语或指令吗？',
      ['通常能够理解','有时需要补充手势或解释','平时多次出现理解困难','尚不确定'],
      '不同年龄、语言和交流方式需要不同解释；这里不使用统一的“通过”标准。',{when:OBS_ENABLED})] : []),
    ...(olderStage ? [q('obsContrast','不同环境的对比','比较平时的安静环境与有背景声的场合，哪种描述更符合孩子的情况？',
      ['主要在嘈杂环境中交流更困难','安静和嘈杂环境都经常有困难','两类环境暂未发现明显差别','还没有足够观察'],
      '这一问题是场景对比，不是听力诊断；建议记录教师或孩子本人的描述。',{when:OBS_ENABLED})] : [])
  ];
}

const littleWorries = ['声音反应与听力检查','语言或早期互动','孕期、出生或耳部健康史','就医准备与下一步安排'];
const schoolWorries = ['课堂听讲与学习交流','安静与嘈杂环境听觉差异','耳部不适或听力变化','准备专业评估与就诊'];

const QUESTIONNAIRES = {
  infant: {
    label:'0—6个月',title:'0—6个月｜婴儿早期观察',
    questions:[ageQ(['0—2个月','3—5个月']),...neonatal(),
      q('sound','日常声音反应','孩子在清醒、平静时，对熟悉的人声或生活声是否有自然反应？',RESPONSE,'只回忆日常表现，不要突然制造巨大声响。'),
      q('voices','熟悉的人声','家人轻声与孩子交流时，是否有安静下来、表情或注意变化等表现？',RESPONSE,'不同月龄表现不同，尤其刚出生时不应凭单一表现做判断。'),
      q('vocal','早期发声',a=>a.age==='0—2个月'?'孩子平时是否会发出哭声以外的轻微声音？':'孩子是否出现不同的咿呀声，或在互动时尝试用声音回应？',RESPONSE,'此题是观察记录，不是独立的发育测试。'),
      ...sceneQuestions('infant'),
      ...universal(littleWorries)]
  },
  baby: {
    label:'6—12个月',title:'6—12个月｜声音关注与早期交流',
    questions:[ageQ(['6—8个月','9—11个月']),...neonatal(),
      q('sound','熟悉声音','孩子是否会注意到身边熟悉的说话声、玩具声等日常声音？',RESPONSE,'根据自然生活中的多次观察回答。'),
      q('name','回应名字','听到自己的名字时，孩子是否会看向说话者或出现其他反应？',RESPONSE,'较小月龄差异较大；请不要反复呼唤以计算“成功次数”。',{when:a=>a.age==='9—11个月'}),
      q('vocal','咿呀发声','孩子是否会发出连续变化的咿呀声，或在交流时发声回应？',RESPONSE,'如家长担忧，请带上具体观察向儿童保健人员咨询。'),
      q('gestures','互动沟通','孩子是否会以看向家人、动作或手势表达互动意愿？',RESPONSE,'此处关注日常互动，而非检验某个规定动作是否达标。'),
      ...sceneQuestions('baby'),
      ...universal(littleWorries)]
  },
  oneTwo: {
    label:'1—2岁',title:'1—2岁｜理解与早期表达',
    questions:[ageQ(['12—17个月','18—23个月']),...hearingCheck(),
      q('name','日常听觉','孩子听到家人呼唤自己的名字时，通常会回应吗？',RESPONSE,'回忆熟悉、自然的交流情况。'),
      q('understand','语言理解','对常用的简单生活指令（如“把球给我”），孩子通常能理解吗？',RESPONSE,'可以按家庭平时使用的语言或方言回答。'),
      q('gesture','互动沟通','孩子是否会用声音、指物或手势表达需求并与家人互动？',RESPONSE,'沟通不只有口语一种形式。'),
      q('express','语言表达','孩子是否会主动用声音或词语表达熟悉的人和物、提出需求？',RESPONSE,'1岁出头的孩子与接近2岁的孩子表现可能差别很大。'),
      q('combine','词语组合','孩子是否开始在日常交流中组合两个或更多词语表达意思？',RESPONSE,'仅针对18—23个月设置；一次回答不能确定发展问题。',{when:a=>a.age==='18—23个月'}),
      ...sceneQuestions('oneTwo'),
      ...universal(littleWorries)]
  },
  toddler: {
    label:'2—3岁',title:'2—3岁｜听觉与语言沟通',
    questions:[ageQ(['24—29个月','30—35个月']),...hearingCheck(),
      q('name','日常听觉反应','孩子听到家人叫自己的名字，通常会回应吗？',RESPONSE,'注意孩子是否正在专注其他事情以及环境有无噪声。'),
      q('repeat','需要重复说话','和孩子交谈时，家人是否经常需要重复相同的话？',DIFFICULTY,'单次没回应不能说明听力损失。'),
      q('understand','语言理解','孩子通常能理解熟悉的简单生活指令吗？',RESPONSE,'按照家中常用的语言回答。'),
      q('express','语言表达','孩子是否会用两个或更多词语组合表达自己的意思？',RESPONSE,'这是家长观察，不是语言障碍诊断。'),
      q('twoStep','连续指令','孩子能否理解日常两步指令，例如“放下玩具，然后来这里”？',RESPONSE,'主要用于30—35个月；需考虑熟悉程度及交流语言。',{when:a=>a.age==='30—35个月'}),
      q('context','观察情境','让您担心的“没听见或没回应”主要出现在什么环境？',['安静环境也经常出现','主要在嘈杂环境出现','仅偶尔发生','暂时说不清'],'描述环境，不做在家规定距离或次数的听力测试。'),
      ...sceneQuestions('toddler'),
      ...universal(littleWorries)]
  },
  preschool: {
    label:'3—4岁',title:'3—4岁｜日常对话与交流',
    questions:[ageQ(['36—41个月','42—47个月']),...hearingCheck(),
      q('name','日常听觉','在没有看着家人时，孩子听到正常交谈或呼唤通常会回应吗？',RESPONSE,'请依据多次自然交流情况选择。'),
      q('repeat','需要重复','平时是否经常需要把同一句话重复给孩子听？',DIFFICULTY),
      q('understand','理解指令','孩子通常能理解日常简单的两步指令或提问吗？',RESPONSE,'熟悉的指令更容易理解；不做一次性强制测试。'),
      q('express','语言表达','孩子通常能用句子说明需求、讲述简单的生活经历吗？',RESPONSE,'不同语言环境和个人发展速度会影响表现。'),
      q('conversation','对话互动','在熟悉的环境中，孩子能否就同一话题与家人进行简单往返交流？',RESPONSE),
      q('noisy','背景噪声','在幼儿园、餐厅等有背景声音的场合，孩子是否经常显得听不清别人说话？',DIFFICULTY),
      ...sceneQuestions('preschool'),
      ...universal(littleWorries)]
  },
  kindergarten: {
    label:'4—6岁',title:'4—6岁｜集体交流与语言理解',
    questions:[ageQ(['4岁—未满5岁','5岁—未满6岁']),...hearingCheck(),
      q('name','普通交谈','孩子在安静环境下听到熟悉的人正常说话通常会回应吗？',RESPONSE),
      q('repeat','需要重复','日常交谈时是否经常需要对孩子重复说话？',DIFFICULTY),
      q('understand','理解讲述','孩子通常能够理解熟悉话题的简单描述、问题或多步骤生活要求吗？',RESPONSE,'具体要求应符合孩子的交流经验。'),
      q('express','叙述交流','孩子通常能比较清楚地表达需求、描述最近发生的事情吗？',RESPONSE),
      q('noisy','集体环境','在集体活动或有背景声音时，孩子是否经常表示“听不清”或跟不上口头说明？',DIFFICULTY),
      q('volume','日常音量','孩子是否经常要求把电视、平板或音乐开得明显更大声？',DIFFICULTY,'不要为此故意播放大音量声音。'),
      ...sceneQuestions('kindergarten'),
      ...universal(littleWorries)]
  },
  schoolYoung: {
    label:'6—9岁',title:'6—9岁｜课堂听讲与同伴交流',
    questions:[ageQ(['6—7岁','8岁']),...hearingCheck(),
      q('name','安静交流','孩子在安静环境中听家人正常交谈，通常能理解并回应吗？',RESPONSE),
      q('classroom','课堂听讲','孩子是否经常反映听不清老师的讲话，或需要同学重复课堂要求？',DIFFICULTY,'依据孩子或老师的反馈；不能单凭学习成绩判断。'),
      q('repeat','家庭对话','在家交谈时，家长是否经常需要重复话语？',DIFFICULTY),
      q('noisy','背景噪声','在食堂、操场等有背景声音的场合，孩子是否经常难以理解别人的话？',DIFFICULTY),
      q('volume','设备音量','孩子是否经常把电视或其他设备的音量调得明显偏大？',DIFFICULTY),
      q('side','左右耳感受','孩子是否曾说过一侧耳朵比另一侧更难听清？',['有过这样的描述','没有相关描述','不清楚'],'这是主观描述，不能代替左右耳的专业听力检测。'),
      ...sceneQuestions('schoolYoung'),
      ...universal(schoolWorries)]
  },
  schoolOlder: {
    label:'9—12岁',title:'9—12岁｜复杂环境与自主听觉描述',
    questions:[ageQ(['9—10岁','11岁']),...hearingCheck(),
      q('selfReport','孩子的主观感受','孩子是否主动提到听不清别人的讲话？',['经常提到','偶尔提到','没有提到','不清楚'],'孩子的描述可以帮助就医，但仍需专业检查。'),
      q('classroom','课堂听讲','孩子是否反映坐在教室某些位置时不容易听清老师？',DIFFICULTY),
      q('repeat','日常交谈','他人是否经常需要重复说话，孩子才能听明白？',DIFFICULTY),
      q('noisy','背景噪声','在多人同时说话或较嘈杂的地方，孩子是否经常难以理解讲话？',DIFFICULTY),
      q('volume','设备音量','孩子是否经常将电视、音乐或耳机音量调得明显偏大？',DIFFICULTY),
      q('tinnitus','耳鸣感受','孩子是否提到耳朵里有持续或反复的嗡鸣、铃声等声音？',['经常提到','偶尔提到','没有提到','不清楚'],'家长不需要自行判断耳鸣原因。'),
      q('side','左右耳差异','孩子是否反映过某一侧耳朵相对听不清？',['有过这样的描述','没有相关描述','不清楚']),
      ...sceneQuestions('schoolOlder'),
      ...universal(schoolWorries)]
  },
  adolescent: {
    label:'12—14岁',title:'12—14岁｜听觉变化与校园生活',
    questions:[ageQ(['12—13岁','14岁']),...hearingCheck(),
      q('selfReport','本人听觉感受','孩子是否说过近期听不清别人讲话？',['经常提到','偶尔提到','没有提到','不清楚']),
      q('classroom','课堂听讲','在课堂上，孩子是否需要重复确认老师口头布置的内容？',DIFFICULTY),
      q('noisy','复杂环境','在多人交谈、食堂或公共交通等背景噪声中，孩子是否经常听不清？',DIFFICULTY),
      q('repeat','日常交谈','家人或同学是否经常要重复说话才能让孩子听明白？',DIFFICULTY),
      q('volume','设备音量','孩子是否经常认为需要把耳机、视频或音乐音量开得明显偏大？',DIFFICULTY,'此题仅记录日常习惯，不是听力测试。'),
      q('tinnitus','耳鸣感受','孩子是否向您描述过耳内嗡鸣或铃声等声音？',['经常提到','偶尔提到','没有提到','不清楚']),
      q('side','左右耳差异','孩子是否感到一侧耳朵明显比另一侧更难听清？',['有过这样的描述','没有相关描述','不清楚']),
      q('noiseExposure','声音暴露','孩子是否经常在高音量音乐、演出等响亮环境中停留？',['经常','偶尔','很少','不清楚'],'只用于帮助整理背景，不可由此推算听力损失。'),
      ...sceneQuestions('adolescent'),
      ...universal(schoolWorries)]
  }
};

const $ = selector => document.querySelector(selector);
const questionOverlay=$('#questionnaireOverlay');
const reportOverlay=$('#reportOverlay');
let activeType=null,step=0,answers={},lastFocus=null;
function visibleQuestions(type, data){return QUESTIONNAIRES[type].questions.filter(item=>!item.when||item.when(data));}
function openOverlay(node){lastFocus=document.activeElement;node.hidden=false;document.body.style.overflow='hidden';node.querySelector('.icon-close')?.focus();}
function closeOverlay(node){node.hidden=true;document.body.style.overflow='';lastFocus?.focus?.();}
function begin(type){
  if(!QUESTIONNAIRES[type])return;
  activeType=type;step=0;answers={};$('#questionnaireTitle').textContent=QUESTIONNAIRES[type].title;
  openOverlay(questionOverlay);renderQuestion();
}
function renderQuestion(){
  const qs=visibleQuestions(activeType,answers);step=Math.min(step,qs.length-1);
  const item=qs[step],value=answers[item.id]??(item.type==='multi'?[]:null);
  $('#questionnaireStepLabel').textContent=`第 ${step+1} 题 / 共 ${qs.length} 题`;
  $('#questionnairePercent').textContent=`${Math.round(step/qs.length*100)}%`;
  $('#questionnaireProgressFill').style.width=`${step/qs.length*100}%`;
  $('#questionCategory').textContent=item.category;
  $('#questionText').textContent=typeof item.text==='function'?item.text(answers):item.text;
  $('#questionHelp').textContent=item.help||'';
  // 安全优先：任何年龄如报告突然明显变差，当场提示及时就医。
  const warning=$('#liveSafetyNote');
  if(warning){
    const urgent = answers.change === '突然明显变差';
    warning.hidden = !urgent;
    if(urgent) warning.textContent='重要提示：您报告了突然明显的听觉变化。请尽快寻求医疗评估，不必为了完成问卷继续进行家庭观察。';
  }

  const container=$('#answerOptions');container.replaceChildren();
  item.options.forEach(option=>{
    const picked=item.type==='multi'?value.includes(option):value===option;
    const button=make('button',`answer-option ${item.type==='multi'?'multi':''} ${picked?'active':''}`);
    button.type='button';button.setAttribute('aria-pressed',String(picked));
    const dot=make('span','answer-dot');dot.setAttribute('aria-hidden','true');
    button.append(dot,make('span','',option));
    button.addEventListener('click',()=>choose(item,option));container.appendChild(button);
  });
  $('#prevQuestion').style.visibility=step===0?'hidden':'visible';
  $('#nextQuestion').textContent=step===qs.length-1?'生成个性化报告 →':'下一步 →';
  $('#nextQuestion').disabled=item.type==='multi'?!value.length:!value;
  $('.questionnaire-body').scrollTop=0;
}
function choose(item,option){
  if(item.type==='multi'){
    const selection=new Set(answers[item.id]||[]);
    if(['没有上述已知情况','不清楚','不清楚具体类型'].includes(option)){selection.clear();selection.add(option);}
    else{
      selection.delete('没有上述已知情况');selection.delete('不清楚');selection.delete('不清楚具体类型');
      selection.has(option)?selection.delete(option):selection.add(option);
    }
    answers[item.id]=[...selection];
  }else{answers[item.id]=option;}
  const activeIds=new Set(visibleQuestions(activeType,answers).map(x=>x.id));
  Object.keys(answers).forEach(key=>{if(!activeIds.has(key))delete answers[key];});
  renderQuestion();
}
$('#nextQuestion').addEventListener('click',()=>{
  if($('#nextQuestion').disabled)return;
  const qs=visibleQuestions(activeType,answers);
  if(step<qs.length-1){step++;renderQuestion();return;}
  const type=activeType,data=structuredClone(answers);
  closeOverlay(questionOverlay);displayReport(type,data);
});
$('#prevQuestion').addEventListener('click',()=>{if(step>0){step--;renderQuestion();}});
$('#closeQuestionnaire').addEventListener('click',()=>closeOverlay(questionOverlay));
$('#closeReport').addEventListener('click',()=>closeOverlay(reportOverlay));
$('#closeReportBottom').addEventListener('click',()=>closeOverlay(reportOverlay));
$('#printReport').addEventListener('click',()=>window.print());
document.querySelectorAll('[data-close]').forEach(el=>el.addEventListener('click',()=>closeOverlay(el.dataset.close==='report'?reportOverlay:questionOverlay)));
document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(!reportOverlay.hidden)closeOverlay(reportOverlay);else if(!questionOverlay.hidden)closeOverlay(questionOverlay);}});
document.querySelectorAll('[data-start]').forEach(button=>button.addEventListener('click',()=>begin(button.dataset.start)));
$('#closePlanned').addEventListener('click',()=>$('#plannedNotice').hidden=true);
$('#menuToggle').addEventListener('click',()=>{const open=$('#mobileNav').classList.toggle('open');$('#menuToggle').setAttribute('aria-expanded',String(open));});
document.querySelectorAll('.mobile-nav a').forEach(link=>link.addEventListener('click',()=>{$('#mobileNav').classList.remove('open');$('#menuToggle').setAttribute('aria-expanded','false');}));
const SAMPLE={age:'30—35个月',screening:'没有接受过',name:'有时',repeat:'经常',understand:'经常',express:'经常',twoStep:'经常',context:'安静环境也经常出现',ear:'曾反复被诊断中耳炎或耳部积液',change:'逐渐变差',hxEntry:'暂时跳过',worry:'孕期、出生或耳部健康史'};
$('#sampleReportBtn').addEventListener('click',()=>displayReport('toddler',SAMPLE,true));
$('#sampleReportBtn2').addEventListener('click',()=>displayReport('toddler',SAMPLE,true));
function make(tag,className='',label){const el=document.createElement(tag);if(className)el.className=className;if(label!==undefined)el.textContent=label;return el;}
function block(title,paragraphs){const section=make('section','report-section');section.append(make('h4','',title));const ul=make('ul','report-list');paragraphs.forEach(line=>ul.append(make('li','',line)));section.append(ul);return section;}
function unique(items){return [...new Set(items.filter(Boolean))];}
function positiveConcern(value){return value==='有时'||value==='很少';}
function complaint(value){return value==='经常'||value==='经常提到'||value==='偶尔提到';}
function unknown(value){return ['不确定','不清楚','没有留意'].includes(value);}
// 生成可审阅的健康史线索，保留“医院确认”和“怀疑”之间的区别。
// add signature: key, title, summary, reason, action, priority
function analyzeHealthHistory(a, add, observations, questions, toVerify){
  if(a.hxEntry !== '愿意补充已知健康史'){
    observations.push('孕期、出生及既往健康史：家长选择暂不填写，不视为不存在相关情况。');
    return;
  }
  const describe=(label,value)=>{if(value!==undefined)observations.push(label+'：'+(Array.isArray(value)?value.join('、'):value)+'。');};
  const ids=[
    ['孕期感染记录',a.pregInfection],['感染类型',a.pregTypes],['孕期阶段',a.pregTrimester],
    ['是否早产',a.premature],['新生儿重症监护',a.nicu],['住院时长',a.nicuDuration],
    ['新生儿黄疸',a.jaundice],['黄疸处理',a.jaundiceTreatment],['医生告知新生儿溶血',a.hemolysis],
    ['出生缺氧相关病史',a.birthOxygen],['儿童既往病史',a.priorIllness],['儿童期听力损失家族史',a.familyHearing]
  ];
  ids.forEach(([label,value])=>describe(label,value));
  const types=Array.isArray(a.pregTypes)?a.pregTypes:[];
  if(['医院检查确认','医生怀疑或建议进一步检查'].includes(a.pregInfection)){
    const confirmed=a.pregInfection==='医院检查确认';
    add('prenatal','孕期感染相关背景',confirmed?'有医院确认的孕期感染史需要说明':'孕期感染情况尚待核实',
      (confirmed?'家长报告医院曾确认孕期相关感染。':'家长报告医生曾怀疑感染或建议进一步检查。')+
      (types.length?' 涉及：'+types.join('、')+'。':'')+
      ' 母亲孕期感染不代表孩子一定发生先天性感染，也不能因此确定听力问题的原因。',
      '整理孕期化验及产检记录，向儿童听力专业人员说明。由医生决定是否需要听力随访与其他检查。',22);
    questions.push('孕期感染是否有医院化验记录？孩子出生后是否接受过相关检查？');
    if(types.includes('巨细胞病毒（CMV）')&&confirmed){
      observations.push('提醒：家长报告的是孕期CMV信息，不代表孩子已经确诊先天性CMV感染。');
    }
  } else if(a.pregInfection==='不清楚')toVerify.push('孕期感染相关记录（如仍可向产检机构查询）。');
  if(a.nicu==='是'&&a.nicuDuration==='5天或更久'){
    add('nicu','新生儿重症监护史','住院经历建议重点向医生说明',
      '家长报告孩子新生儿期曾在重症监护室住院5天或更久。这属于专业评估中需要了解的既往背景，不等于孩子一定有听力问题。',
      '携带NICU出院记录，向儿童听力评估机构咨询既往筛查与后续随访情况。',24);
    questions.push('NICU期间是否曾接受听力筛查和后续复查？');
  }
  if(a.jaundiceTreatment==='换血治疗'){
    add('exchange','新生儿严重黄疸治疗史','需要核实既往听力随访',
      '家长报告新生儿黄疸曾接受换血治疗；这与普通黄疸观察不同，是专业人员需知晓的背景。问卷无法判断听觉系统是否受到影响。',
      '携带黄疸治疗和听力筛查记录，咨询儿童听力专业人员是否需要进一步评估或随访。',18);
    questions.push('当年黄疸换血治疗后是否安排过听力检查？');
  }
  const prior=Array.isArray(a.priorIllness)?a.priorIllness:[];
  if(prior.includes('曾经医生确诊脑膜炎')){
    add('meningitis','儿童期脑膜炎病史','建议说明感染后的听觉变化',
      '家长报告孩子曾由医生确诊脑膜炎。此病史需要由专业人员结合治疗经过与当前情况评估，不代表现在一定有听力损失。',
      '携带既往住院和复查记录，向儿童听力相关专业人员咨询是否需要听力评估。',17);
    questions.push('脑膜炎恢复后是否进行过听力检查？');
  }
  if(a.familyHearing==='有已知情况'){
    add('family','儿童期听力损失家族史','建议向专业人员说明家族情况',
      '家长报告家族中有人从儿童期开始出现听力损失。家族背景可能有助于专业人员制定检查计划，但不能据此诊断孩子。',
      '就医时向医生说明已知的家族成员听力情况，是否需进一步检查应由专业人员评估。',27);
  }
  const other=[];
  if(a.premature==='是')other.push('曾早产');
  if(a.nicu==='是'&&a.nicuDuration!=='5天或更久')other.push('NICU住院史');
  if(a.jaundice==='是'&&a.jaundiceTreatment!=='换血治疗')other.push('新生儿黄疸史');
  if(a.hemolysis==='是')other.push('医生告知新生儿溶血');
  if(a.birthOxygen==='是')other.push('医生提示出生期缺氧相关病史');
  other.push(...prior.filter(x=>!HX_NONE_OPTIONS.includes(x)&&x!=='曾经医生确诊脑膜炎'));
  if(other.length){
    add('otherHistory','其他出生及既往健康资料','有助于完善就医背景，但不单独确定疾病',
      '家长提供了：'+other.join('；')+'。这些情况需要结合专业病史解释，不能单独据此推断听力损失。',
      '有条件时保留出院小结、检查报告等材料，就诊时交由医生核实。',33);
  }
  if(a.nicu==='是'&&a.nicuDuration==='不清楚')toVerify.push('新生儿重症监护住院时间及相关出院记录。');
  if(a.jaundice==='是'&&a.jaundiceTreatment==='不清楚')toVerify.push('新生儿黄疸是否接受过换血治疗等具体处理。');
  if(a.familyHearing==='不清楚')toVerify.push('家族中是否有儿童期开始的听力损失。');
}

// 多维度观察记录，不生成诊断、概率、听力级别或“筛查通过”结论。
function analyze(type,a){
  const areas=[],observations=[],actions=[],questions=[],toVerify=[],healthDetails=[];
  const add=(key,title,summary,reason,action,priority=30)=>{
    if(areas.some(x=>x.key===key))return;
    areas.push({key,title,summary,reason,action,priority});actions.push(action);
  };
  const ageLabel=a.age||QUESTIONNAIRES[type].label;
  const sudden=a.change==='突然明显变差';
  const infantAge=['infant','baby'].includes(type);
  const schoolAge=['schoolYoung','schoolOlder','adolescent'].includes(type);
  if(sudden){
    add('sudden','突然出现的听觉变化','建议尽快寻求医疗评估','家长报告听觉表现突然明显变差。问卷不能判断原因，也不能代替及时就医。','尽快联系医疗机构；如发生突然明显听力下降，应立即寻求专业医疗意见，不要等待自行反复测试。',0);
    questions.push('听觉变化从什么时候开始？是一侧、双侧还是说不清？');
  }
  if(infantAge){
    if(a.screening==='未通过'){
      observations.push('新生儿听力筛查：家长报告未通过。');
      if(a.followup==='尚未完成'||a.followup==='不清楚'){
        add('screen','新生儿筛查与随访','需要尽快确认诊断性听力评估','家长报告筛查未通过，且尚未确认完成专业评估；未通过筛查不等于确诊。','尽快联系出生医院或儿童听力评估机构，确认并完成专业评估。',5);
        questions.push('筛查结果是一侧还是双侧？是否保存了复筛或转诊记录？');
      }else if(a.followup==='已完成，但医生建议继续复查'){
        add('screenFollow','已开展检查的后续复查','需要落实医生建议的复查安排','家长报告后续评估提示需继续复查。','按照原检查机构建议完成复查，携带既往检查资料。',7);
      }else observations.push('家长报告筛查后已接受专业评估；仍需结合日后情况关注听觉变化。');
    }else if(a.screening==='没有筛查'||a.screening==='不清楚'){
      add('screenUnknown','筛查记录不明确','需要核实是否接受过新生儿筛查','家长未能确认新生儿筛查记录；这不是疾病证据，但需要核实。','联系出生医院查询新生儿听力筛查记录，并向儿童保健或听力专业人员咨询。',23);
      toVerify.push('出生医院的新生儿听力筛查记录。');
    }else observations.push('新生儿听力筛查：家长报告已通过，但既往通过不能排除后来出现的听力问题。');
  }else{
    if(a.screening==='接受过，被建议复查'){
      add('check','已有听力评估的复查','需要核实既往复查建议','家长报告曾被建议复查，需要明确是否已经完成。','联系原评估机构，按照专业意见完成复查。',8);
    }else if(a.screening==='没有接受过'||a.screening==='不清楚'){
      toVerify.push('孩子是否接受过正规的儿童听力评估。');
    }
  }
  const hearingSignals=[];
  if(positiveConcern(a.sound))hearingSignals.push('日常声音反应较少');
  if(positiveConcern(a.voices))hearingSignals.push('对熟悉人声的反应较少');
  if(positiveConcern(a.name))hearingSignals.push('听到名字时的回应不稳定');
  if(complaint(a.repeat))hearingSignals.push('交谈中常需要重复话语');
  if(a.context==='安静环境也经常出现')hearingSignals.push('在安静环境也曾观察到听觉交流困难');
  if(a.change==='逐渐变差')hearingSignals.push('听觉反应逐渐发生变化');
  if(a.selfReport==='经常提到'||a.selfReport==='偶尔提到')hearingSignals.push('孩子自述听不清');
  if(a.side==='有过这样的描述')hearingSignals.push('孩子提及左右耳听觉感受不一致');
  if(a.obsPattern==='经常需要重复或回应少')hearingSignals.push('多次自然交流中反复需要重复或回应较少');
  if(a.obsPattern==='多次没有观察到明显反应')hearingSignals.push('多次生活情境中家长未观察到明显声音反应');
  if(a.obsContrast==='安静和嘈杂环境都经常有困难')hearingSignals.push('在安静与嘈杂环境均报告交流困难');

  if(hearingSignals.length){
    add('hearing',schoolAge?'日常听觉与沟通困难':infantAge?'婴儿日常听觉反应':'日常听觉反应',
      '建议向听力专业人员进一步咨询',
      '家长的观察包含：'+unique(hearingSignals).join('；')+'。这些表现可由多种原因引起，不能据此判断听力损失类型和程度。',
      '记录发生情境、持续时间与既往检查信息，联系儿童听力专业人员了解适龄评估。',12);
    questions.push('这些情况主要发生在安静环境还是有背景声音时？');
  }
  const communicationSignals=[];
  if(positiveConcern(a.understand))communicationSignals.push('日常语言理解较少或不稳定');
  if(positiveConcern(a.express))communicationSignals.push('语言表达方面有家长担忧');
  if(positiveConcern(a.gesture))communicationSignals.push('互动沟通表现较少');
  if(positiveConcern(a.gestures))communicationSignals.push('互动行为观察较少');
  if(a.age==='18—23个月'&&positiveConcern(a.combine))communicationSignals.push('词语组合表达较少');
  if(a.age==='30—35个月'&&positiveConcern(a.twoStep))communicationSignals.push('两步生活指令理解有疑问');
  if(positiveConcern(a.conversation))communicationSignals.push('往返对话或交流较少');
  if(a.obsUnderstand==='平时多次出现理解困难')communicationSignals.push('家长描述反复出现日常理解困难');
  // 新生儿/极低月龄咿呀少不能直接对应语言发展异常，避免误导。
  if(!(type==='infant'&&a.age==='0—2个月')&&positiveConcern(a.vocal))communicationSignals.push('发声或咿呀互动较少');
  if(communicationSignals.length){
    add('language',infantAge?'早期发声与沟通':'语言理解与交流',
      '建议结合年龄与交流环境了解',
      '问卷记录到：'+unique(communicationSignals).join('；')+'。语言发展存在个体差异，也不能仅因能够听到部分声音就排除听力问题。',
      '向儿科/儿童保健或语言相关专业人员说明具体沟通情况，并了解是否需要专业听力评估。',19);
    questions.push('孩子主要使用什么语言或方言交流？最具体的困难是什么？');
  }
  if(a.ear&&EAR_OPTIONS.slice(0,2).includes(a.ear)){
    add('ear','中耳与耳部健康','需要由医生了解耳部情况','家长报告：'+a.ear+'。耳部问题可能影响听觉，但问卷不能确认中耳炎或积液。',
      '预约儿科或耳鼻喉科，向医生说明耳部病史与听觉表现，由医生决定是否需要耳部及听力检查。',10);
    questions.push('是否有已有的耳部检查、治疗或复查记录？');
  }
  if(complaint(a.classroom)||complaint(a.noisy)||a.context==='主要在嘈杂环境出现'||a.obsContrast==='主要在嘈杂环境中交流更困难'){
    const source=[];
    if(complaint(a.classroom))source.push('课堂听讲时常需重复确认');
    if(complaint(a.noisy))source.push('背景噪声下交流困难');
    if(a.context==='主要在嘈杂环境出现')source.push('主要在嘈杂场景观察到困难');
    if(a.obsContrast==='主要在嘈杂环境中交流更困难')source.push('家长反馈嘈杂环境的交流比安静环境困难');
    add('noise','复杂环境中的听觉交流','建议记录课堂及背景噪声下的具体表现',
      source.join('；')+'。教室距离、噪声、注意状态等都可能影响交流，不能推断某种听力疾病。',
      '记录具体环境并咨询儿童听力专业人员；如在校明显受影响，可与老师沟通合理的课堂交流支持。',schoolAge?13:21);
  }
  if(complaint(a.volume)){
    add('volume','日常设备音量习惯','可进一步了解音量与听觉感受','家长报告孩子经常调高电子设备的音量。习惯与听力之间并非一一对应。',
      '保持安全音量，记录孩子是否还出现需要重复说话等情况；如有担忧请咨询专业人员。',24);
  }
  if(a.tinnitus==='经常提到'||a.tinnitus==='偶尔提到'){
    add('tinnitus','孩子描述的耳鸣感受','建议向医生说明主观耳鸣体验','孩子曾向家长描述耳内声音；问卷无法判断耳鸣原因。',
      '联系耳鼻喉或听力专业人员，记录发生时间、持续情况、是否伴听觉变化；若突然伴随明显听力下降应尽快就医。',16);
  }
  if(a.noiseExposure==='经常')observations.push('家长报告较多响亮环境暴露；建议与专业人员讨论安全聆听习惯。');
  analyzeHealthHistory(a,add,healthDetails,questions,toVerify);
  for(const item of visibleQuestions(type,a)){
    if(item.id==='age'||item.id==='worry'||item.id==='followup'||item.id==='hxEntry'||item.id.startsWith('obs')||['pregInfection','pregTypes','pregTrimester','premature','nicu','nicuDuration','jaundice','jaundiceTreatment','hemolysis','birthOxygen','priorIllness','familyHearing'].includes(item.id))continue;
    if(a[item.id]!==undefined)observations.push(item.category+'｜'+(typeof item.text==='function'?item.text(a):item.text)+'：'+a[item.id]);
  }
  if(a.worry)questions.push('家长当前最希望了解：'+a.worry+'。');
  if(!areas.length){
    if(toVerify.length||Object.values(a).some(value=>unknown(value))){
      add('unknown','信息仍需补充','不能依据目前回答作出正常判断','部分观察信息或既往检查记录尚不明确。','核实既往听力筛查/评估记录，记录自然生活中的交流情况；如有担忧及时咨询专业人员。',40);
    }else{
      add('general','本次未归纳出特定关注方向','不等于通过听力筛查或不存在问题','该演示规则没有从当前回答中整理出明确关注方向，但问卷不是正规的听力筛查。','如家长仍担心或孩子出现听觉变化，请咨询儿童听力相关专业人员。',50);
    }
  }
  // 单次观察仅作为报告中的场景记录，不触发独立的疾病/听力等级判断。
  let scene=null;
  if(OBS_ENABLED(a)){
    const now=OBS_NOW(a);
    const notes=[
      `记录方式：${now?'一次自然发生的日常交流':'回忆平时的自然交流'}`,
      `环境：${a.obsSetting||'未提供'}`
    ];
    if(a.obsDistance) notes.push('大致距离：'+a.obsDistance);
    if(a.obsAttention) notes.push('注意状态：'+a.obsAttention);
    if(a.obsVisual) notes.push('视觉线索：'+a.obsVisual);
    if(a.obsVolume) notes.push('说话声音：'+a.obsVolume);
    if(a.obsSingle) notes.push('该次交流反应：'+a.obsSingle);
    if(a.obsPattern) notes.push('多次日常观察：'+a.obsPattern);
    if(a.obsUnderstand) notes.push('语言理解：'+a.obsUnderstand);
    if(a.obsContrast) notes.push('环境对比：'+a.obsContrast);
    let explanation='这些信息可以帮助家长更清楚地向专业人员描述场景。单次未回应并不能说明听力损失；回应一次也不能排除听力问题。';
    if(a.obsContrast==='主要在嘈杂环境中交流更困难')explanation='家长记录到背景声音与交流困难之间的差异。环境噪声、注意状态等都可能影响表现，建议把具体场景告诉儿童听力专业人员。';
    if(a.obsContrast==='安静和嘈杂环境都经常有困难')explanation='家长报告多种环境均存在交流困难。这值得进一步向专业人员描述和评估，但问卷不能确认原因。';
    if(a.obsPattern==='多次没有观察到明显反应'||a.obsPattern==='经常需要重复或回应少')explanation='家长报告在多次日常情境中存在持续的担忧。建议及时与儿童听力专业人员沟通，不要依靠增加音量或反复呼唤进行自测。';
    scene={notes,explanation};
  }
  areas.sort((a,b)=>a.priority-b.priority);
  // 行动清单按报告关注方向的优先顺序显示，避免主建议与清单顺序不一致。
  const orderedActions=areas.map(area=>area.action);
  orderedActions.push('保存家长观察摘要，向专业人员说明持续时间、具体情境及已有检查情况。');
  return {areas,observations:unique(observations),healthDetails:unique(healthDetails),actions:unique(orderedActions),questions:unique(questions),toVerify:unique(toVerify),sudden,age:ageLabel,worry:a.worry,scene};
}

// 仅用于展示资料填写覆盖情况，不是医学评分、听力测量或患病风险。
const COMPLETENESS_FIELDS = [
  {key:'hearing',label:'听觉与日常交流',ids:['sound','voices','name','repeat','context','classroom','noisy','side','tinnitus','volume','selfReport','change']},
  {key:'language',label:'发声与语言沟通',ids:['vocal','gesture','gestures','understand','express','combine','twoStep','conversation']},
  {key:'screen',label:'筛查与耳部情况',ids:['screening','followup','ear']},
  {key:'scene',label:'家庭情境记录',ids:['obsSetting','obsDistance','obsAttention','obsVisual','obsVolume','obsSingle','obsPattern','obsUnderstand','obsContrast'],optIn:'obsMode'},
  {key:'history',label:'孕期与既往健康史',ids:['pregInfection','pregTypes','pregTrimester','premature','nicu','nicuDuration','jaundice','jaundiceTreatment','hemolysis','birthOxygen','priorIllness','familyHearing'],optIn:'hxEntry'}
];
function coverageRows(type, data) {
  const qs=visibleQuestions(type,data);
  const present=new Set(qs.map(q=>q.id));
  return COMPLETENESS_FIELDS.map(g=>{
    const eligible=g.ids.filter(id=>present.has(id));
    const answered=eligible.filter(id=>Array.isArray(data[id])?data[id].length>0:data[id]!==undefined).length;
    const skipped=(g.key==='scene'&&data.obsMode==='暂时跳过')||(g.key==='history'&&data.hxEntry==='暂时跳过');
    return {...g,answered,total:eligible.length,skipped,pct:eligible.length?Math.round(answered/eligible.length*100):0};
  });
}
function coverageChart(type,data){
  const wrap=make('section','report-section coverage-section');
  wrap.append(make('h4','','信息填写概览'));
  wrap.append(make('p','report-caption','仅表示本次问卷已记录的信息范围，不代表孩子的听力健康程度或医学风险。'));
  const grid=make('div','coverage-grid');
  coverageRows(type,data).forEach(row=>{
    const item=make('div','coverage-item');
    const header=make('div','coverage-heading');
    header.append(make('span','',row.label),make('strong','',row.skipped?'家长选择跳过':row.total?`已记录 ${row.answered}/${row.total} 项`:'此阶段无对应题目'));
    const track=make('div','coverage-track');track.setAttribute('role','img');
    track.setAttribute('aria-label',`${row.label}：${row.skipped?'已跳过':`已记录${row.answered}项，共${row.total}项`}`);
    const fill=make('span','coverage-fill');fill.style.width=(row.skipped?0:row.pct)+'%';track.append(fill);
    item.append(header,track);grid.append(item);
  });
  wrap.append(grid);return wrap;
}
function reportArea(area,index){
  const article=make('article',`insight-card ${index===0?'lead':''}`);
  const head=make('div','insight-heading');head.append(make('span','insight-number',String(index+1).padStart(2,'0')));
  const titleGroup=make('div');titleGroup.append(make('h5','',area.title),make('p','insight-summary',area.summary));head.append(titleGroup);article.append(head);
  const labels=make('div','insight-detail-labels');
  labels.append(make('span','insight-kicker','依据家长提供的回答'));
  article.append(labels);
  const evidence=make('p','insight-reason',area.reason);article.append(evidence);
  const advice=make('div','insight-action');advice.append(make('strong','','对应的下一步建议'),make('p','',area.action));article.append(advice);
  return article;
}
function reportTag(text,variant=''){return make('span',`report-tag ${variant}`,text);}
function foldBlock(title,paragraphs){
  const details=make('details','report-fold');
  const summary=make('summary','',title);
  summary.append(make('span','fold-count',`${paragraphs.length} 项`));
  details.append(summary);
  const ul=make('ul','report-list');paragraphs.forEach(line=>ul.append(make('li','',line)));
  details.append(ul);return details;
}
function numberedSteps(items){
  const section=make('section','report-section steps-report');section.append(make('h4','','下一步行动清单'));
  section.append(make('p','report-caption','可逐项核对。清单仅供就医准备，不能替代专业评估。'));
  const list=make('div','report-step-list');
  items.forEach((item,i)=>{
    const row=make('label','report-step');const cb=make('input');cb.type='checkbox';cb.setAttribute('aria-label',`完成行动${i+1}`);
    row.append(cb,make('span','step-num',String(i+1).padStart(2,'0')),make('span','step-text',item));list.append(row);
  });section.append(list);return section;
}
function nextActionCard(result){
  const card=make('div','next-action-card');
  card.append(make('div','next-action-icon','↗'));
  const info=make('div');info.append(make('span','next-action-eyebrow',result.sudden?'优先事项 · 请及时就医':'建议优先了解的一步'));
  info.append(make('strong','',result.areas[0].action));card.append(info);return card;
}
function reportFacts(result,data,demo){
  const metrics=make('div','report-facts');
  [
    {label:'孩子年龄阶段',value:result.age},
    {label:'关注方向',value:result.areas.filter(x=>!['general','unknown'].includes(x.key)).length+' 项'},
    {label:'家庭情境',value:result.scene?'已记录':'未记录'},
    {label:'健康史补充',value:data.hxEntry==='愿意补充已知健康史'?'已补充':'未补充'}
  ].forEach(item=>{
    const cell=make('div','report-fact');cell.append(make('span','',item.label),make('strong','',item.value));metrics.append(cell);
  });
  return metrics;
}
let lastReportPlainText='';
function reportPlainText(result){
  const lines=['HearPath｜儿童听力健康观察与就诊准备摘要',`记录日期：${new Date().toLocaleDateString('zh-CN')}`,`儿童年龄：${result.age}`,
    '说明：这是家长自述的观察记录，不能诊断或排除听力障碍。','',
    '【观察关注方向】', ...result.areas.map(a=>`- ${a.title}：${a.reason}`),
    '', '【下一步行动】', ...result.actions.map((x,i)=>`${i+1}. ${x}`),
    '', '【已记录的孩子表现】', ...result.observations.map(x=>'- '+x),
    ...(result.healthDetails.length?['','【孕期、出生及既往健康史】',...result.healthDetails.map(x=>'- '+x)]:[]),
    ...(result.scene?['','【家庭情境记录】',...result.scene.notes.map(x=>'- '+x)]:[]),
    ...(result.toVerify.length?['','【有待核实的信息】',...result.toVerify.map(x=>'- '+x)]:[]),
    '','重要：请联系相关专业人员判断下一步检查。'];
  return lines.join('\n');
}
async function copyReportSummary(){
  const notice=$('#copyFeedback');
  if(!lastReportPlainText){notice.textContent='请先生成报告';return;}
  try{
    if(!navigator.clipboard||!navigator.clipboard.writeText)throw Error('no-clipboard');
    await navigator.clipboard.writeText(lastReportPlainText);
    notice.textContent='已复制就诊摘要';
  }catch(e){
    notice.textContent='浏览器未允许复制，请使用打印 / 存为 PDF';
  }
}
$('#copySummary').addEventListener('click',copyReportSummary);
let printingWasOpen=[];
window.addEventListener('beforeprint',()=>{
  printingWasOpen=[...document.querySelectorAll('#reportContent details')].map(node=>[node,node.open]);
  printingWasOpen.forEach(([node])=>node.open=true);
});
window.addEventListener('afterprint',()=>{
  printingWasOpen.forEach(([node,old])=>node.open=old);
  printingWasOpen=[];
});
function displayReport(type,data,demo=false){
  const result=analyze(type,data),root=$('#reportContent');root.replaceChildren();
  $('#copyFeedback').textContent='';
  lastReportPlainText=reportPlainText(result);
  const banner=make('div','report-banner report-cover');
  const overline=make('div','report-eyebrow',demo?'DEMO / 虚构案例 · 报告演示':'HEARPATH / 儿童家庭观察摘要');
  banner.append(overline,make('h3','','每一份观察，都值得被认真理解。'));
  banner.append(make('p','','报告日期：'+new Date().toLocaleDateString('zh-CN')+'　·　非医学诊断，仅供整理家长所提供的信息。'));
  banner.append(make('div','report-cover-wave','∿ ∿ ∿ ∿ ∿'));
  root.append(banner);
  if(result.sudden){
    const alert=make('div','report-urgent');alert.append(make('strong','','请优先及时就医'),make('p','','家长报告孩子突然出现明显的听觉变化。请尽快联系医疗机构评估，不要等问卷结果，也不要在家反复测试。'));root.append(alert);
  }
  root.append(reportFacts(result,data,demo));
  const section=make('section','report-section');section.append(make('h4','','本次主要关注的方向'));
  section.append(make('p','report-caption','根据问卷回答整理出的信息方向，不代表疾病名称、患病概率或医学风险等级；多个方向可以同时出现。'));
  const focus=make('div','primary-focus');focus.append(make('div','primary-focus-title',result.areas[0].title),make('p','',result.areas[0].summary));section.append(focus);
  result.areas.forEach((area,i)=>section.append(reportArea(area,i)));root.append(section);
  root.append(nextActionCard(result));
  root.append(coverageChart(type,data));
  if(result.scene){
    const sceneSection=make('section','report-section scene-report');
    sceneSection.append(make('h4','','家庭情境观察记录'));
    sceneSection.append(make('p','report-caption','由家长记录的环境与交流情况，不属于规范听力筛查或诊断测试。'));
    const grid=make('div','scene-detail-grid');
    result.scene.notes.forEach(note=>grid.append(make('div','scene-detail',note)));
    sceneSection.append(grid,make('p','scene-explanation',result.scene.explanation));root.append(sceneSection);
  }
  root.append(numberedSteps(result.actions));
  if(result.toVerify.length)root.append(block('仍需核实的信息',result.toVerify));
  if(result.questions.length)root.append(block('就诊时可以说明或询问',result.questions));
  if(result.healthDetails.length)root.append(foldBlock('展开：孕期、出生及既往健康史原始记录',result.healthDetails));
  if(result.observations.length)root.append(foldBlock('展开：本次问卷原始观察记录',result.observations));
  const care=make('section','report-section');care.append(make('h4','','给家长的一句话'));
  care.append(make('p','report-note','发现孩子有一些让人担心的表现，想弄清原因是可以理解的。现在还无法通过问卷确定原因。您可以把这份记录带给专业人员，让下一次沟通更加清楚。'));
  root.append(care);
  const refs=make('section','report-section report-references');refs.append(make('h4','','资料参考'));
  [['CDC｜儿童听力损失相关背景','https://www.cdc.gov/hearing-loss-children/about/'],['CDC｜先天性CMV与听力','https://www.cdc.gov/cytomegalovirus/congenital-infection/hearing-loss.html'],['JCIH｜婴儿听力联合委员会资料','https://www.jcih.org/posstatemts.htm'],['ASHA｜规范的儿童听力筛查','https://www.asha.org/practice-portal/professional-issues/childhood-hearing-screening/'],['ASHA｜儿童沟通发展里程碑','https://www.asha.org/public/developmental-milestones/communication-milestones/'],['NIDCD｜儿童耳部感染与中耳问题','https://www.nidcd.nih.gov/health/ear-infections-children']].forEach(([name,url])=>{
    const link=make('a','report-source',name+' ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';refs.append(link);
  });root.append(refs);
  root.append(make('div','report-warning','重要说明：这是竞赛演示原型，问卷题目和分析规则未经临床验证及专业审核。不能用于医学筛查、诊断或治疗建议；填写进度和关注方向数量也不是健康评分。所有数据只在当前浏览器页面内存处理，刷新即清除，请勿填写可识别儿童身份的敏感信息。'));
  openOverlay(reportOverlay);
}
