import type { Locale, RealmId } from "./i18n";

export type Chapter = {
  eyebrow: string;
  title: string;
  summary: string;
  body: string[];
  aside: string;
};

export type VerificationStage = {
  code: string;
  title: string;
  horizon: string;
  direction: string;
  summary: string;
  milestone: string;
};

export type RealmContent = {
  id: Exclude<RealmId, "home" | "about">;
  index: string;
  title: string;
  cue: string;
  lead: string;
  copy: string;
  chapters: Chapter[];
};

export type HeroPillar = {
  realm: Exclude<RealmId, "home" | "about">;
  index: string;
  title: string;
  subtitle: string;
};

export type LocaleContent = {
  brand: {
    name: string;
    homeAria: string;
    worldLabel: string;
  };
  nav: {
    ariaLabel: string;
    items: Array<{ id: RealmId; index: string; label: string }>;
    switchToLabel: string;
    switchAria: string;
  };
  controls: {
    pulseGenesis: string;
    pulseDone: string;
    exploreWorld: string;
    soundOn: string;
    soundOff: string;
    soundOnAria: string;
    soundOffAria: string;
    scrollCue: string;
    copyEmail: string;
    copiedEmail: string;
    webglFallbackBadge: string;
  };
  routeMeta: Record<
    RealmId,
    {
      title: string;
      description: string;
      ogEyebrow: string;
      ogHeadline: string;
    }
  >;
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
    lead: string;
    pillars: HeroPillar[];
  };
  realms: {
    imagine: RealmContent;
    alive: RealmContent;
    connect: RealmContent;
  };
  diagrams: {
    imagineNodes: Array<{ code: string; label: string; sub: string }>;
    aliveRings: Array<{ code: string; label: string; detail: string }>;
    roadmapEyebrow: string;
    roadmapTitle: string;
    roadmapLead: string;
    verificationStages: VerificationStage[];
  };
  about: {
    eyebrow: string;
    index: string;
    title: string;
    paragraphs: string[];
    statusBadge: string;
    links: {
      blog: {
        label: string;
        value: string;
        description: string;
        url: string;
      };
      email: {
        label: string;
        value: string;
        description: string;
      };
    };
    colophon: string;
  };
};

export const CONTENT: Record<Locale, LocaleContent> = {
  "zh-CN": {
    brand: {
      name: "YAQXUAN",
      homeAria: "返回世界入口",
      worldLabel: "WORLD",
    },
    nav: {
      ariaLabel: "世界区域导航",
      items: [
        { id: "home", index: "00", label: "入口" },
        { id: "imagine", index: "01", label: "想象" },
        { id: "alive", index: "02", label: "生命" },
        { id: "connect", index: "03", label: "连接" },
        { id: "about", index: "04", label: "关于" },
      ],
      switchToLabel: "EN",
      switchAria: "Switch language to English",
    },
    controls: {
      pulseGenesis: "唤醒创世脉冲",
      pulseDone: "星穹已回应",
      exploreWorld: "步入世界深处",
      soundOn: "声景开启",
      soundOff: "声景关闭",
      soundOnAria: "关闭环境声景",
      soundOffAria: "开启环境声景",
      scrollCue: "向下漫游五个区域",
      copyEmail: "复制邮箱",
      copiedEmail: "已复制",
      webglFallbackBadge: "星图静谧模式 · ASTRAL VIEW",
    },
    routeMeta: {
      home: {
        title: "YAQXUAN — 让想象成为可以进入的世界",
        description: "一座从想象中诞生、能够被进入并持续生活的个人世界。",
        ogEyebrow: "WORLD / 00",
        ogHeadline: "让想象成为可以进入的世界。",
      },
      imagine: {
        title: "想象 — YAQXUAN",
        description: "让故事继续，让想象获得空间，让知识成为可以亲自经历的世界。",
        ogEyebrow: "REALM / 01 · IMAGINE",
        ogHeadline: "故事不必结束，想象也不必停留在脑海里。",
      },
      alive: {
        title: "生命 — YAQXUAN",
        description: "角色、记忆、关系与持续历史，让虚拟世界不再只是一处布景。",
        ogEyebrow: "REALM / 02 · ALIVE",
        ogHeadline: "相遇会留下痕迹，世界在你离开后仍然呼吸。",
      },
      connect: {
        title: "连接 — YAQXUAN",
        description: "从人工智能与虚拟现实出发，逐渐缩短人的意图与虚拟世界之间的距离。",
        ogEyebrow: "REALM / 03 · CONNECT",
        ogHeadline: "身体进入空间，意图抵达世界，感受再回到身体。",
      },
      about: {
        title: "关于 — YAQXUAN",
        description: "由 Yaqxuan 发起的个人长期探索，从愿景与学习开始。",
        ogEyebrow: "ORIGIN / 04 · ABOUT",
        ogHeadline: "一项从想象出发的个人长期探索。",
      },
    },
    hero: {
      eyebrow: "A WORLD THAT REMEMBERS / 00",
      titleLine1: "让想象成为",
      titleLine2: "可以进入的世界。",
      lead: "不是隔着屏幕观看另一个世界，而是在其中被看见、被记住，并留下真实发生过的历史。",
      pillars: [
        {
          realm: "imagine",
          index: "01",
          title: "想象 · 空间生成",
          subtitle: "世界从何而来",
        },
        {
          realm: "alive",
          index: "02",
          title: "生命 · 记忆与主权",
          subtitle: "世界为何活着",
        },
        {
          realm: "connect",
          index: "03",
          title: "连接 · 意图与归途",
          subtitle: "人如何真正抵达",
        },
      ],
    },
    realms: {
      imagine: {
        id: "imagine",
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
        id: "alive",
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
        id: "connect",
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
    },
    diagrams: {
      imagineNodes: [
        { code: "01", label: "延续叙事", sub: "STORY CONTINUITY" },
        { code: "02", label: "个人宇宙", sub: "OWNED COSMOS" },
        { code: "03", label: "具身经验", sub: "LIVED KNOWLEDGE" },
      ],
      aliveRings: [
        { code: "I", label: "人格稳态", detail: "跨情境一致的判断与性格" },
        { code: "II", label: "关系记忆", detail: "被改变的房间与共同历史" },
        { code: "III", label: "世界主权", detail: "可暂停、回溯并由你掌控" },
      ],
      roadmapEyebrow: "VERIFICATION SEQUENCE / 01 → 05",
      roadmapTitle: "一条诚实的技术验证顺序",
      roadmapLead: "不跳过当下，也不模糊终点的距离。点击任意阶段查看该层的验证焦点。",
      verificationStages: [
        {
          code: "01",
          title: "可信角色与持续世界",
          horizon: "当前起点 · NOW",
          direction: "世界内在一致性",
          summary: "先用一个房间、稳定人格与连续记忆验证：没有炫目外设，人与虚拟存在能否建立真实的关系重量。",
          milestone: "验证命题：角色与世界状态在离开与归来之间保持因果自洽。",
        },
        {
          code: "02",
          title: "空间化具身体验",
          horizon: "近期路径 · NEAR",
          direction: "人 → 空间进入 (VR)",
          summary: "借助虚拟现实把屏幕平面转化为尺度、距离与转身可达的环境，让身体感自然介入叙事。",
          milestone: "验证命题：空间尺度与第一人称在场感是否显著深化共鸣。",
        },
        {
          code: "03",
          title: "多模态自然交互",
          horizon: "中期探索 · MID",
          direction: "人 → 世界读取",
          summary: "整合语音语调、视线停留、姿态节奏与微动作，减少菜单与指令感，让世界顺应直觉。",
          milestone: "验证命题：交互退居无形后，人是否更专注于世界本身而非操作工具。",
        },
        {
          code: "04",
          title: "非侵入式脑机接口",
          horizon: "远期前沿 · FRONTIER",
          direction: "人 → 意图补充",
          summary: "在可靠的前提下引入注意力、专注度与情绪节律等非侵入式神经信号，补全未曾言说的状态。",
          milestone: "验证命题：仅当信号真实提升体验时才保留，绝不为了技术名词堆砌。",
        },
        {
          code: "05",
          title: "安全的双向神经连接",
          horizon: "终极远景 · HORIZON",
          direction: "世界 ↔ 感官回返",
          summary: "从触觉、温感与平衡反馈起步，走向更长期、谨慎且以安全为前提的双向感官与神经回馈研究。",
          milestone: "验证命题：让身体真正感知世界，同时把边界与伦理永远留在起点。",
        },
      ],
    },
    about: {
      eyebrow: "ORIGIN / 04 · BY YAQXUAN",
      index: "04",
      title: "一项从想象出发的个人长期探索。",
      paragraphs: [
        "YAQXUAN 由 Yaqxuan 发起。它目前处于愿景与学习阶段，尝试理解怎样让故事、角色、空间和人的意图真正连接起来。",
        "这座主站呈现长期方向；日常的学习笔记、技术实验、失败记录与逐步成形的答案，都会诚实地留在个人日志里。这里没有虚构团队，也不把尚未发生的未来描述成已经完成的成果。",
      ],
      statusBadge: "VISION & LEARNING STAGE · 诚实演进中",
      links: {
        blog: {
          label: "研究与思考日志",
          value: "yaqxuan.xyz",
          description: "记录技术实践、拆解、学习路径与生活思考",
          url: "https://yaqxuan.xyz",
        },
        email: {
          label: "联络与对话",
          value: "hello@yaqxuan.com",
          description: "欢迎关于世界生成、AI 角色记忆与空间交互的交流",
        },
      },
      colophon: "YAQXUAN · 让想象成为可以进入的世界",
    },
  },
  en: {
    brand: {
      name: "YAQXUAN",
      homeAria: "Return to World Threshold",
      worldLabel: "WORLD",
    },
    nav: {
      ariaLabel: "World Realms Navigation",
      items: [
        { id: "home", index: "00", label: "Threshold" },
        { id: "imagine", index: "01", label: "Imagine" },
        { id: "alive", index: "02", label: "Alive" },
        { id: "connect", index: "03", label: "Connect" },
        { id: "about", index: "04", label: "About" },
      ],
      switchToLabel: "中文",
      switchAria: "切换为简体中文",
    },
    controls: {
      pulseGenesis: "Pulse Genesis",
      pulseDone: "Cosmos Answered",
      exploreWorld: "Enter the Cosmos",
      soundOn: "Sound On",
      soundOff: "Sound Off",
      soundOnAria: "Mute ambient soundscape",
      soundOffAria: "Enable ambient soundscape",
      scrollCue: "Scroll to traverse the five realms",
      copyEmail: "Copy",
      copiedEmail: "Copied",
      webglFallbackBadge: "ASTRAL CHART MODE",
    },
    routeMeta: {
      home: {
        title: "YAQXUAN — Where Imagination Becomes a Habitable World",
        description: "A personal generative world born from imagination—meant to be entered, remembered, and lived within.",
        ogEyebrow: "WORLD / 00",
        ogHeadline: "Where Imagination Becomes a Habitable World.",
      },
      imagine: {
        title: "Imagine — YAQXUAN",
        description: "Let stories continue beyond the final page, give personal universes room, and turn knowledge into lived space.",
        ogEyebrow: "REALM / 01 · IMAGINE",
        ogHeadline: "Stories need not end on the last page.",
      },
      alive: {
        title: "Alive — YAQXUAN",
        description: "Consistent identity, relational memory, and sovereign worlds that keep breathing after you leave.",
        ogEyebrow: "REALM / 02 · ALIVE",
        ogHeadline: "Encounters leave traces. The world breathes while you are away.",
      },
      connect: {
        title: "Connect — YAQXUAN",
        description: "From AI and VR toward multimodal intent and careful bidirectional neural connection.",
        ogEyebrow: "REALM / 03 · CONNECT",
        ogHeadline: "Body enters space, intent reaches the world, sensation returns.",
      },
      about: {
        title: "About — YAQXUAN",
        description: "A long-horizon personal inquiry initiated by Yaqxuan—starting from vision, study, and honest progress.",
        ogEyebrow: "ORIGIN / 04 · ABOUT",
        ogHeadline: "A long-horizon personal inquiry born from imagination.",
      },
    },
    hero: {
      eyebrow: "A WORLD THAT REMEMBERS / 00",
      titleLine1: "Where Imagination Becomes",
      titleLine2: "a Habitable World.",
      lead: "Not a spectacle watched through glass—a living place where you are seen, remembered, and leave real history behind.",
      pillars: [
        {
          realm: "imagine",
          index: "01",
          title: "Imagine · Spatial Genesis",
          subtitle: "Where the world begins",
        },
        {
          realm: "alive",
          index: "02",
          title: "Alive · Memory & Sovereignty",
          subtitle: "Why the world breathes",
        },
        {
          realm: "connect",
          index: "03",
          title: "Connect · Intent & Return",
          subtitle: "How we truly arrive",
        },
      ],
    },
    realms: {
      imagine: {
        id: "imagine",
        index: "01",
        title: "Imagine",
        cue: "Where the world begins",
        lead: "Stories need not end—and imagination need not stay locked inside the mind.",
        copy: "Giving stories, private universes, and abstract knowledge real spatial form: places to enter, reshape, and return to as they grow.",
        chapters: [
          {
            eyebrow: "STORY / 01",
            title: "Stories need not stop on the final page.",
            summary: "Worlds built whole, inhabitants living through unwritten hours, and your arrival becoming new history.",
            body: [
              "Today we read stories, watch them unfold, or extend them in text threads. YAQXUAN reaches one step further: turning the streets, seasons, people, and bonds once confined to prose into spaces you can physically step into.",
              "This is not about copying existing franchises. We explore how an original world persists on its own terms—where characters carry lived pasts, cities hold onto what happened, and narrative continues past any scripted ending.",
            ],
            aside: "Not merely watching a story, but spending real time inside it.",
          },
          {
            eyebrow: "IMAGINATION / 02",
            title: "Everyone deserves a cosmos of their own.",
            summary: "Complete with a single visitor—and opened to others only when you choose.",
            body: [
              "A personal world should never obey a single rigid game loop. You can shift weather, time, terrain, and architecture, or redefine who you are within it. World rules are living material, not fixed walls.",
              "Solitude is a whole experience, never a stripped-down version of multiplayer. Inviting another person remains an intentional act: who belongs, who enters, and which memories are shared stay in the owner's hands.",
            ],
            aside: "World sovereignty belongs first to the one who imagines and inhabits it.",
          },
          {
            eyebrow: "EXPERIENCE / 03",
            title: "Knowledge can become a lived chapter.",
            summary: "Abstract ideas woven into environments, people, and events—understood through real consequence.",
            body: [
              "Some concepts feel forbidding not because only a few minds can grasp them, but because we only approach them behind flat text and diagrams. An immersive world turns relationships into geometry, principles into events, and practice into consequential memory.",
              "This never replaces reading or reflection; it gives them body, context, and emotional weight. Our hope is to widen the lives ordinary people can experience—making distant, costly, or unbuilt realities genuinely reachable.",
            ],
            aside: "Bringing rare, distant, or not-yet-existent experiences within ordinary reach.",
          },
        ],
      },
      alive: {
        id: "alive",
        index: "02",
        title: "Alive",
        cue: "Why the world breathes",
        lead: "Characters are not lines waiting for a trigger, nor are cities backdrops lit only for a camera.",
        copy: "Stable identity, long-horizon memory, evolving bonds, and persistent causality—so every encounter carries real weight.",
        chapters: [
          {
            eyebrow: "IDENTITY / 01",
            title: "She should remain unmistakably herself.",
            summary: "Grounded in coherent values, temperament, and history—capable of believable choices in unscripted moments.",
            body: [
              "A living character is neither a bag of catchphrases nor a compliant assistant bending to every prompt. She knows who she is, what she cares about, and how she reads others, keeping every response anchored in one continuous self.",
              "Here, artificial intelligence does not exist to make characters talk more—it sustains identity across time, allowing growth, hesitation, and change without regenerating personality from scratch each session.",
            ],
            aside: "A response never seen before, yet instantly recognizable as her.",
          },
          {
            eyebrow: "MEMORY / 02",
            title: "Encounters leave lasting traces.",
            summary: "Inhabitants remember shared moments, relationships shift over time, and small choices echo much later.",
            body: [
              "Memory is not hoarding every transcript forever. What matters is discerning what actually altered a bond: a promise kept, a missed meeting, a moved object, or an afternoon known only to two.",
              "Character memory, physical room state, and shared history must stay consistent. When you return, the room still rests as you left it—and she knows the days in between truly passed.",
            ],
            aside: "Being remembered is what gives a virtual meeting the gravity of time.",
          },
          {
            eyebrow: "SOVEREIGNTY / 03",
            title: "The world keeps breathing while you are away.",
            summary: "A cosmos with its own quiet rhythm, while ultimate authority remains firmly in its creator's hands.",
            body: [
              "Continuity does not require burning compute every idle second. A world can advance coherently across key events, greet your return with believable change, and preserve clear cause and effect.",
              "You can pause, revisit, rebuild, or choose whether another human ever crosses the threshold. A solitary cosmos can be every bit as intricate, tender, and thoughtfully crafted as a shared city.",
            ],
            aside: "Not a crowded public plaza on someone else's server, but a place truly yours.",
          },
        ],
      },
      connect: {
        id: "connect",
        index: "03",
        title: "Connect",
        cue: "How we truly arrive",
        lead: "Body enters space, intent reaches the world, and sensation returns to the body.",
        copy: "A disciplined path starting from AI and virtual reality, moving through multimodal interaction toward careful neural connection.",
        chapters: [
          {
            eyebrow: "WORLD & BODY / 01",
            title: "Build the world first—and bring the body inside.",
            summary: "AI gives the world memory and agency; VR gives the visitor spatial scale, presence, and distance.",
            body: [
              "Artificial intelligence forms the mind of the world: sustaining inhabitants, environments, relationships, and history. Virtual reality supplies the vessel of space, letting you stand inside another place rather than peer through a pane.",
              "Phase one does not wait for distant hardware miracles. A single room, one credible inhabitant, and a thread of shared memory are enough to test whether co-presence feels fundamentally different.",
            ],
            aside: "Validate shared presence first; shorten the distance step by step.",
          },
          {
            eyebrow: "READ / 02",
            title: "Let the world sense unspoken intent.",
            summary: "Voice, gaze, posture, physiological cues, and non-invasive BCI narrow the translation gap.",
            body: [
              "Reading attention, state, and bounded intent is information flowing from human to machine. It is nowhere near reading full thoughts—and must never be overstated as solved.",
              "Near-term progress begins with voice nuance, eye tracking, gesture, and behavioral context before testing what non-invasive neural signals can reliably add. Only signals that genuinely deepen immersion belong inside the world.",
            ],
            aside: "Not to showcase hardware, but to bring interaction closer to natural intent.",
          },
          {
            eyebrow: "RETURN / 03",
            title: "Reading intent and returning sensation are two distinct paths.",
            summary: "Haptics, force feedback, and spatial audio carry feeling back; bidirectional neural links remain a distant horizon.",
            body: [
              "Understanding intent travels from person to computer; touch, warmth, balance, and embodiment travel back from world to person. Today we expand presence through acoustics, optics, and haptics, while direct neural write-back demands decades of rigorous caution.",
              "YAQXUAN stands firmly in its vision and learning phase. Our verification sequence stays honest: believable beings and persistent worlds, spatial embodiment, multimodal intent, non-invasive BCI, and—only much later—safe bidirectional links.",
            ],
            aside: "State the destination clearly—and state just as clearly how far away it remains.",
          },
        ],
      },
    },
    diagrams: {
      imagineNodes: [
        { code: "01", label: "Narrative Continuity", sub: "UNBROKEN STORY" },
        { code: "02", label: "Owned Cosmos", sub: "PRIVATE UNIVERSE" },
        { code: "03", label: "Lived Knowledge", sub: "EMBODIED LEARNING" },
      ],
      aliveRings: [
        { code: "I", label: "Identity Coherence", detail: "Values & judgment held across time" },
        { code: "II", label: "Relational Trace", detail: "Changed rooms & shared history" },
        { code: "III", label: "World Sovereignty", detail: "Pausable, reversible, owned by you" },
      ],
      roadmapEyebrow: "VERIFICATION SEQUENCE / 01 → 05",
      roadmapTitle: "An Honest Verification Sequence",
      roadmapLead: "Never skipping the present, never blurring the horizon. Select a stage to inspect its focus.",
      verificationStages: [
        {
          code: "01",
          title: "Believable Beings & Persistent State",
          horizon: "STARTING POINT · NOW",
          direction: "Internal World Coherence",
          summary: "Prove with one room, stable personality, and relational memory that a virtual encounter can carry emotional weight without exotic hardware.",
          milestone: "Hypothesis: Character and room causality remain intact between visits.",
        },
        {
          code: "02",
          title: "Spatial Embodiment (VR)",
          horizon: "NEAR TERM · PHASE II",
          direction: "Human → Spatial Entry",
          summary: "Replace flat viewport framing with architectural scale, proximity, and natural bodily orientation inside the world.",
          milestone: "Hypothesis: First-person spatial scale measurably deepens narrative presence.",
        },
        {
          code: "03",
          title: "Multimodal Natural Intent",
          horizon: "MID TERM · PHASE III",
          direction: "Human → Unspoken Cue",
          summary: "Combine vocal tone, gaze dwell, and subtle gesture so menus dissolve and attention moves effortlessly.",
          milestone: "Hypothesis: Removing explicit UI chrome lets visitors inhabit rather than operate.",
        },
        {
          code: "04",
          title: "Non-Invasive Neural Readout",
          horizon: "FRONTIER · PHASE IV",
          direction: "Human → Bounded Signal",
          summary: "Test whether non-invasive attention and affective EEG signals reliably enrich world responsiveness without noise or friction.",
          milestone: "Hypothesis: Keep only signals that measurably improve lived experience.",
        },
        {
          code: "05",
          title: "Safe Bidirectional Neural Link",
          horizon: "ULTIMATE HORIZON · PHASE V",
          direction: "World ↔ Embodied Return",
          summary: "Progress from spatial sound and haptics toward long-term, safety-first research on direct sensory feedback.",
          milestone: "Hypothesis: Full sensory return anchored by uncompromising human safety.",
        },
      ],
    },
    about: {
      eyebrow: "ORIGIN / 04 · BY YAQXUAN",
      index: "04",
      title: "A long-horizon personal inquiry born from imagination.",
      paragraphs: [
        "YAQXUAN is initiated by Yaqxuan. It currently lives in a vision and study phase—exploring how stories, coherent characters, spatial computing, and human intent can converge into one living place.",
        "This site holds the enduring thesis; everyday technical notes, experiments, missteps, and hard-won lessons are documented openly in the research log. There is no fictional studio here, and no unbuilt future is framed as shipped reality.",
      ],
      statusBadge: "VISION & LEARNING STAGE · HONESTLY EVOLVING",
      links: {
        blog: {
          label: "Research & Reflection Log",
          value: "yaqxuan.xyz",
          description: "Engineering notes, experiments, essays, and ongoing study",
          url: "https://yaqxuan.xyz",
        },
        email: {
          label: "Correspondence",
          value: "hello@yaqxuan.com",
          description: "Open to thoughtful exchange on generative worlds, AI memory, and spatial craft",
        },
      },
      colophon: "YAQXUAN · Where Imagination Becomes a Habitable World",
    },
  },
};
