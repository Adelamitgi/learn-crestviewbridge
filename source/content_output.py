# Writing and speaking prompts (original). Picture prompts use emoji scenes.
# picture: [scene emoji, given word, scene in English, model sentence]
PICTURE = [
 ["🛒🧾💳", "结账", "A customer paying at a shop counter", "这位顾客正在超市结账。"],
 ["🚗🚗🚕🚦", "堵车", "Cars stuck at a traffic light", "下班的时候，这条路经常堵车。"],
 ["🤧🌡️🛏️", "咳嗽", "Someone sick in bed", "他感冒了，咳嗽得很厉害。"],
 ["🏃⏰🚌", "来不及", "Running for a bus, clock showing late", "快跑吧，再不走就来不及了。"],
 ["🧳🛂✈️", "安检", "Luggage at airport security", "坐飞机以前要先过安检。"],
 ["📱🔳💰", "扫码", "Phone scanning a QR code to pay", "现在买东西只要扫码就可以付钱。"],
 ["🥇🏆🎉", "获得", "A gold medal and trophy", "她在比赛中获得了第一名。"],
 ["🛍️🏷️💸", "打折", "Shopping bags and price tags", "这家商场的衣服正在打八折。"],
 ["❄️🧥🥶", "降温", "Snow and a cold person in a coat", "明天要降温了，你多穿点儿衣服。"],
 ["💡🔌🚪", "节约", "Turning off a light by the door", "离开房间时关灯，可以节约用电。"],
 ["🧹📚🛏️", "整理", "Tidying a messy room", "周末我把房间整理得很干净。"],
 ["👨‍🏫👍🧒", "表扬", "Teacher giving a thumbs-up to a pupil", "这个孩子被老师表扬了。"],
 ["💉🏥😣", "打针", "Getting an injection at hospital", "小孩子都很怕打针。"],
 ["🏋️💪⏱️", "健身", "Working out at the gym", "他每天下班以后都去健身房健身。"],
 ["📦🚚🏠", "快递", "A delivery van and a parcel", "我网购的东西明天就能送到，快递非常快。"],
 ["😳🙈💬", "害羞", "Someone hiding their face while talking", "她第一次上台讲话，有点儿害羞。"],
 ["😢💔📱", "伤心", "Someone crying over a phone message", "听到这个消息，他伤心极了。"],
 ["📸🏯🗺️", "景点", "Taking a photo at a famous site", "长城是中国最有名的景点之一。"],
 ["🍜🥟🍢", "美食", "A table of street food", "西安有很多好吃的美食。"],
 ["💼📄🤝", "应聘", "A job applicant with a CV", "他准备好简历，去那家公司应聘。"],
 ["🎹🎶👧", "钢琴", "A girl playing the piano", "她从五岁开始学钢琴。"],
 ["🙇‍♂️🙏😔", "道歉", "Someone bowing and apologising", "他做错了事，向朋友道歉了。"],
 ["🧑‍🤝‍🧑🎂🎈", "聚会", "Friends at a birthday party", "周末我们在朋友家开了一个生日聚会。"],
 ["🌧️☂️🚶", "忽然", "Sudden rain on a walker", "我们正在散步，忽然下起了大雨。"],
]

# essay: [prompt, type, frame lines]
ESSAY = [
 ["请写一篇不少于80字的短文，介绍一下你最难忘的一次旅行。", "Narrative",
  ["开头：时间、地点、和谁", "中间：首先…然后…最后…", "结尾：虽然…但是… / 让我很难忘"]],
 ["请写一篇不少于80字的短文，谈谈你学习汉语的方法。", "Practical",
  ["开头：我学汉语已经…了", "中间：首先…其次…另外…", "结尾：只有…才… / 总的来说…"]],
 ["请写一篇不少于80字的短文，介绍一位对你影响很大的人。", "Describe a person",
  ["开头：他/她是谁，和我的关系", "中间：性格 + 一件具体的事", "结尾：他/她让我明白了…"]],
 ["请写一篇不少于80字的短文，谈谈你对网购的看法。", "Opinion",
  ["开头：现在越来越多的人…", "中间：一方面…另一方面… / 但是…", "结尾：我认为… 所以…"]],
 ["请写一篇不少于80字的短文，介绍你的家乡。", "Describe a place",
  ["开头：我的家乡在…", "中间：天气、美食、景点", "结尾：欢迎你… / 我很想念…"]],
 ["请写一篇不少于80字的短文，说说你的一个周末。", "Narrative",
  ["开头：上个周末…", "中间：上午…下午…晚上…", "结尾：虽然…但是… / 我觉得…"]],
 ["请写一篇不少于80字的短文，谈谈手机对生活的影响。", "Opinion",
  ["开头：手机已经成为…", "中间：好处… 坏处…", "结尾：可见… / 我们应该…"]],
 ["请写一篇不少于80字的短文，介绍一个中国的节日。", "Describe custom",
  ["开头：…是中国的传统节日", "中间：时间、人们做什么、吃什么", "结尾：对中国人来说…"]],
 ["请写一篇不少于80字的短文，谈谈怎样保护环境。", "Opinion",
  ["开头：保护环境不是…而是…", "中间：拿我来说… 比如…", "结尾：只要每个人…就…"]],
 ["请写一篇不少于80字的短文，写一次让你后悔的经历。", "Narrative",
  ["开头：那是…的时候", "中间：发生了什么 + 结果", "结尾：从那以后，我…"]],
]

# speaking part 1: short passages read aloud once, retell in 40 s
RETELL = [
 "小李昨天去超市买东西，结账的时候才发现钱包忘在家里了。幸好他手机里有钱，最后用手机扫码付了钱。",
 "今天早上下大雨，路上堵车很厉害。我平时八点到学校，今天九点才到，老师已经开始上课了。",
 "我的室友很喜欢运动。他每天早上六点起床去跑步，不管刮风还是下雨，他都坚持，所以身体特别好。",
 "上个周末，我和朋友去参观了一个博物馆。那里有很多历史文物，导游给我们介绍得很详细，我们学到了很多。",
 "姐姐上个月去一家公司应聘。面试的时候她很紧张，但是回答得很好。一个星期以后，公司通知她下周一去上班。",
 "最近天气降温了，很多同学感冒了。医生提醒大家要多穿衣服，多喝水，晚上早点儿睡觉。",
 "我第一次来中国的时候，连路都不认识。有一次我迷路了，一位阿姨不但给我指路，还带我走到了地铁站。",
 "妈妈把我小时候的照片整理好了，放在一个大盒子里。看着这些照片，我想起了很多快乐的回忆。",
]

# speaking part 2: three-panel picture stories
STORY = [
 ["⏰😴", "🏃💨🚌", "😮‍💨🏫", "Oversleeps, runs for the bus, arrives breathless at school"],
 ["🛍️💳", "📦🚚", "😞👕", "Buys clothes online, parcel arrives, they don't fit"],
 ["🌧️☂️", "🧒😢", "🤝☂️", "Rain, a child without an umbrella, someone shares theirs"],
 ["📚✏️", "📝😰", "🏆😄", "Studies hard, nervous exam, gets a top result"],
 ["🍳🔥", "😱💨", "🍕📞", "Cooks, burns the food, orders takeaway instead"],
 ["🎂🎁", "🤫🏠", "🎉😲", "Plans a surprise party, hides, friend is surprised"],
]

# speaking part 3: questions printed in characters only
QUESTIONS = [
 "你觉得学习汉语最难的是什么？为什么？",
 "你喜欢住在大城市还是小城市？请说说你的理由。",
 "请谈谈你对网购的看法。",
 "你认为朋友之间最重要的是什么？",
 "如果有一个月的假期，你打算怎么安排？",
 "你觉得手机对学生的学习有什么影响？",
 "请介绍一下你最喜欢的一个中国城市。",
 "你认为保护环境，每个人能做些什么？",
 "说说一个对你影响很大的人。",
 "你觉得工作中最重要的是工资还是兴趣？为什么？",
 "你是怎么放松自己的？",
 "请谈谈你们国家和中国在饮食方面的不同。",
]
