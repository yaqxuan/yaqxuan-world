export type WorldPath = "/" | "/imagine" | "/alive" | "/connect" | "/about";

export type IntroStage = "seed" | "birthing" | "revealed";

export type DistrictPath = Exclude<WorldPath, "/" | "/about">;

export type Chapter = {
  eyebrow: string;
  title: string;
  summary: string;
  body: string[];
  aside?: string;
};

export type District = {
  path: DistrictPath;
  index: string;
  title: string;
  cue: string;
  lead: string;
  copy: string;
  chapters: Chapter[];
};

export const routeMeta: Record<WorldPath, { title: string; description: string }> = {
  "/": {
    title: "YAQXUAN — 让想象成为可以进入的世界",
    description: "一座从想象中诞生、能够被进入并持续生活的个人世界。",
  },
  "/imagine": {
    title: "想象 — YAQXUAN",
    description: "让故事继续，让想象获得空间，让知识成为可以亲自经历的世界。",
  },
  "/alive": {
    title: "生命 — YAQXUAN",
    description: "角色、记忆、关系与持续历史，让虚拟世界不再只是一处布景。",
  },
  "/connect": {
    title: "连接 — YAQXUAN",
    description: "从人工智能与虚拟现实出发，逐渐缩短人的意图与虚拟世界之间的距离。",
  },
  "/about": {
    title: "关于 — YAQXUAN",
    description: "由 Yaqxuan 发起的个人长期探索，从愿景与学习开始。",
  },
};

export const districts: Record<"imagine" | "alive" | "connect", District> = {
  imagine: {
    path: "/imagine",
    index: "01",
    title: "想象",
    cue: "世界从何而来",
    lead: "故事不必结束，想象也不必停留在脑海里。",
    copy: "让故事、个人想象与知识获得真正的空间：可以进入、探索、改变，也可以在离开以后继续生长。",
    chapters: [
      {
        eyebrow: "STORY / 01",
        title: "故事不必停在最后一页。",
        summary: "世界被完整地构建出来，人物在未被写下的时间里继续生活，而你的到来会成为新的历史。",
        body: [
          "今天，我们阅读故事、观看故事，也在文字对话中续写故事。YAQXUAN 想再向前一步：让原本只能被想象的街道、季节、人物与关系，成为可以亲自抵达的空间。",
          "这里不复刻任何既有作品。我们探索的是一套让原创世界持续存在的方法：角色拥有自己的经历，城市保留发生过的事情，故事不因一段预设剧情结束而停止。",
        ],
        aside: "不是观看故事，而是在故事中留下属于你的时间。",
      },
      {
        eyebrow: "IMAGINATION / 02",
        title: "每个人都可以拥有自己的宇宙。",
        summary: "它可以只有你一位访客，也可以在你愿意时向另一个人打开。",
        body: [
          "个人世界不必服从统一的玩法。你可以改变天气、时间、地貌与建筑，也可以重新定义自己在其中的身份。世界的规则不是不可触碰的边界，而是可以与你共同生长的材料。",
          "独处是完整的体验，而不是多人世界的残缺版本。连接他人始终是一种选择：世界属于谁、谁能进入、哪些记忆被分享，都应由它的拥有者决定。",
        ],
        aside: "世界主权首先属于创造并生活在其中的人。",
      },
      {
        eyebrow: "EXPERIENCE / 03",
        title: "知识也可以变成一段人生。",
        summary: "抽象的概念被写进环境、人物和事件，在解决真实情境的过程中逐渐被理解。",
        body: [
          "有些知识之所以难，并不是因为它只能被少数人理解，而是因为我们只能隔着文字和屏幕接近它。沉浸式世界可以把关系变成空间，把原理变成事件，把练习变成一段有后果的经历。",
          "这并不取代阅读与思考，而是为它们增加身体、情境与记忆。我们希望虚拟世界最终扩大普通人能够拥有的人生可能性——不是承诺消除现实差距，而是让更多曾经稀缺的体验变得可抵达。",
        ],
        aside: "让昂贵、遥远或尚不存在的体验，不再只属于极少数人。",
      },
    ],
  },
  alive: {
    path: "/alive",
    index: "02",
    title: "生命",
    cue: "世界为何活着",
    lead: "角色不是等待触发的台词，城市也不是只在镜头前存在的布景。",
    copy: "稳定的人格、长期记忆、关系与持续历史，让一次相遇可以被记住，让世界因为你的存在而改变。",
    chapters: [
      {
        eyebrow: "IDENTITY / 01",
        title: "她应当像她自己。",
        summary: "角色拥有稳定的性格、价值、经历与表达方式，也能在从未被写过的情境里作出可信的选择。",
        body: [
          "一个角色不是一组口头禅，也不是随时迎合访客的通用助手。她需要知道自己是谁、在乎什么、如何理解他人，并让每一次新反应仍然属于同一个人。",
          "人工智能在这里不是替角色说更多的话，而是维持身份的一致性：允许成长、犹豫与改变，同时避免人格在每次对话中被重新生成。",
        ],
        aside: "新的行为，可以从未出现过，却仍让人相信“这就是她”。",
      },
      {
        eyebrow: "MEMORY / 02",
        title: "相遇会留下痕迹。",
        summary: "人物记得共同经历，关系在时间中变化，微小选择也可能在很久以后重新出现。",
        body: [
          "记忆不是把所有对话永久保存。真正有意义的是理解哪些事情改变了关系：一场承诺、一次错过、一件被移动的物品，或某个只有两个人知道的下午。",
          "角色的记忆、世界的状态与共同历史需要彼此一致。下次归来时，房间仍保留离开前的样子，而她也知道这段间隔曾经发生。",
        ],
        aside: "被记住，才让一次虚拟相遇拥有时间的重量。",
      },
      {
        eyebrow: "SOVEREIGNTY / 03",
        title: "世界在你离开后仍然呼吸。",
        summary: "城市拥有持续状态与自己的节律，而世界的最高权限始终掌握在它的主人手中。",
        body: [
          "持续世界不等于永不停歇地消耗算力。它可以在关键事件间推演时间，在你回归时呈现可信的变化，并为每一次改变保留可理解的因果。",
          "你可以暂停、回望、重建，也可以决定是否邀请其他真人进入。多人不是默认终点；一个人的世界同样可以复杂、丰饶，并被认真设计。",
        ],
        aside: "它不是服务器上的公共广场，而是一处可被你真正拥有的地方。",
      },
    ],
  },
  connect: {
    path: "/connect",
    index: "03",
    title: "连接",
    cue: "人如何抵达",
    lead: "身体进入空间，意图抵达世界，感受再回到身体。",
    copy: "这条路从人工智能与虚拟现实开始，经过多模态交互与脑机接口，走向更自然、更直接的连接。",
    chapters: [
      {
        eyebrow: "WORLD & BODY / 01",
        title: "先让世界存在，也让身体抵达。",
        summary: "人工智能赋予世界生成、记忆和回应的能力；虚拟现实让人获得空间、距离与身体。",
        body: [
          "人工智能是世界持续运转的大脑：驱动人物、环境、关系与历史。虚拟现实则是身体和空间的载体，让你不再隔着一块平面观看，而是站在另一个地方。",
          "第一阶段并不等待遥远技术成熟。一个房间、一个可信角色、一段能延续的共同记忆，就足以验证这种相处是否带来真正不同的体验。",
        ],
        aside: "先验证“共同存在”，再逐步缩短人与世界的距离。",
      },
      {
        eyebrow: "READ / 02",
        title: "让世界理解没有说出口的意图。",
        summary: "语音、目光、动作、生理状态与非侵入式脑机接口，共同减少人与世界之间的翻译。",
        body: [
          "读取注意力、状态和有限意图，是信息从人流向计算机。它与读取完整思想并不是一回事，也不应被夸大成已经实现的能力。",
          "近期路径会从语音、眼动、手势和行为理解开始，再探索非侵入式脑机接口能够可靠补充什么。只有当一种信号真正改善体验，它才值得进入世界。",
        ],
        aside: "目标不是炫耀一种输入设备，而是让交互逐渐接近自然意图。",
      },
      {
        eyebrow: "RETURN / 03",
        title: "理解意图，与产生感受，是两条路。",
        summary: "触觉、力反馈与神经刺激把信息从世界送回人；双向神经连接是更远的方向，而非当前成果。",
        body: [
          "读取意图属于从人到计算机；触觉、温度、平衡与身体感属于从计算机到人。今天可以先借助声音、视觉、触觉设备与空间反馈扩大临场感，更直接的神经写入仍需要漫长而谨慎的研究。",
          "YAQXUAN 目前处于愿景与学习阶段。未来验证顺序是：可信角色与持续世界、空间化体验、多模态自然交互、非侵入式脑机接口，最后才是安全的双向神经连接。",
        ],
        aside: "把终点说清楚，也把我们距离终点有多远说清楚。",
      },
    ],
  },
};

export const districtList = [districts.imagine, districts.alive, districts.connect];

export function districtFromPath(path: DistrictPath) {
  return path === "/imagine"
    ? districts.imagine
    : path === "/alive"
      ? districts.alive
      : districts.connect;
}

export function normalizePath(pathname: string): WorldPath {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return clean in routeMeta ? (clean as WorldPath) : "/";
}
