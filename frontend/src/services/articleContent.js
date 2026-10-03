import { normalizeTags } from '../data/demoData.js'

const DEFAULT_GUIDE = {
  file: 'example.txt',
  principle: '学习一个技术概念时，先明确它要解决的问题、成立的前提和需要付出的代价。示例只是入口，能够解释边界并迁移到新场景才算真正掌握。',
  steps: ['明确输入、预期结果和限制条件。', '运行最小示例，确认每一步产生的变化。', '替换一个条件或加入异常输入，观察边界行为。'],
  pitfalls: ['只记住结论，没有验证它成立的前提。', '直接复制示例，却没有根据真实输入补充错误处理。'],
  checklist: ['能用自己的话解释核心概念。', '能指出至少一个不适用的场景。', '保留可以重复运行的示例与验证结果。']
}

const DOMAIN_GUIDES = {
  Python: {
    file: 'example.py',
    principle: 'Python 强调清楚的意图与可预测的数据流。语法更短不一定更好；真正值得采用的写法，应该让输入、状态变化和异常边界更容易被下一位读者理解。',
    steps: ['在独立虚拟环境中运行最小示例。', '打印或断言关键中间值，确认对象类型与状态变化。', '增加空值、异常输入和不同版本环境进行验证。'],
    pitfalls: ['忽略可变对象、副作用或异常路径，只验证了正常输入。', '没有确认项目的 Python 版本与依赖版本是否支持示例。'],
    checklist: ['正常输入、空值和异常分支都有验证。', '依赖与 Python 版本已经记录。', '实现保持直接，没有为了炫技压缩逻辑。']
  },
  'C++': {
    file: 'example.cpp',
    principle: 'C++ 的正确性常常取决于所有权、生命周期、值类别和编译期约束。先回答资源由谁持有、引用能活多久，再讨论语法便利与性能。',
    steps: ['开启较严格的编译器警告并构建最小程序。', '跟踪对象创建、移动、复制和销毁的时间点。', '使用 Sanitizer 或调试器验证越界与生命周期假设。'],
    pitfalls: ['把能够编译误认为行为一定正确，忽略未定义行为。', '在没有基准数据时提前优化，增加所有权复杂度。'],
    checklist: ['资源所有者与生命周期清楚。', '边界、失效引用和异常路径已经检查。', '性能结论有基准测试或分析工具支持。']
  },
  计算机基础: {
    file: 'concept.txt',
    principle: '基础概念要放回完整过程理解：输入如何进入系统、经过哪些状态变化、最后得到什么输出，以及时间、空间或可靠性成本是什么。',
    steps: ['用一个足够小的例子手算或画出状态变化。', '写出关键不变量、复杂度或协议约束。', '把规模放大，比较不同方案的代价与适用边界。'],
    pitfalls: ['混淆名称相近但层级不同的概念。', '只背定义，没有用实例验证过程和边界。'],
    checklist: ['可以画图或举例说明完整过程。', '知道结论依赖哪些前提。', '能与相近概念比较取舍。']
  },
  工程实践: {
    file: 'workflow.txt',
    principle: '工程方法的价值是让结果可重复、问题可定位、变更可回退。好的流程会留下输入、操作、验证证据和失败后的恢复路径。',
    steps: ['先写下目标、环境和可以判断成功的标准。', '执行最小流程并保留命令、日志或测试结果。', '模拟一次失败，确认回滚和交接步骤可用。'],
    pitfalls: ['只有操作步骤，没有验证成功与否的证据。', '流程依赖个人电脑上的隐含配置，换环境就无法复现。'],
    checklist: ['别人可以按照记录独立复现。', '测试、日志或截图可以证明结果。', '失败后的回滚与恢复方式明确。']
  },
  'Web 开发': {
    file: 'example.html',
    principle: 'Web 功能横跨浏览器、网络和服务端。设计时要同时考虑语义、状态、失败、不同设备和信任边界，优先使用平台已有的可靠能力。',
    steps: ['先在浏览器中验证最小交互和语义结构。', '分别检查键盘操作、窄屏和慢网络状态。', '从客户端与服务端两侧验证输入和权限边界。'],
    pitfalls: ['只在自己的屏幕和网络环境中测试。', '把客户端校验当作安全边界，信任了可被修改的输入。'],
    checklist: ['语义、键盘与触控操作均可使用。', '加载、空数据和失败状态完整。', '服务端重新验证所有不可信输入。']
  },
  'AI 与数据': {
    file: 'experiment.py',
    principle: '数据与模型结论必须能够追溯到数据版本、划分方式、评价指标和实验条件。先保证评估可信，再讨论更复杂的模型或更高的分数。',
    steps: ['固定数据版本、划分方式与随机种子。', '建立简单基线，只改变一个变量运行实验。', '记录指标、失败样本和复现步骤，再判断是否改进。'],
    pitfalls: ['训练与评估数据相互泄漏，导致结果虚高。', '只看单一平均指标，忽略类别分布和真实业务成本。'],
    checklist: ['数据泄漏、缺失值和类别分布已检查。', '指标与真实目标一致。', '数据、参数和实验过程可以复现。']
  }
}

const CATEGORY_GUIDES = {
  语言基础: {
    context: '语言特性不是孤立语法糖，它会影响数据表达、控制流、错误处理和团队可读性。应当比较新旧写法的行为差异，而不是只比较代码行数。',
    action: '说明每个关键表达式的输入、返回值和副作用。',
    pitfall: '把“写得更短”当成“写得更清楚”，导致边界和意图被隐藏。'
  },
  算法与数据结构: {
    context: '算法选择来自输入规模、访问模式和资源限制。先定义状态与不变量，再分析时间和空间复杂度，最后才是实现细节。',
    action: '用最小输入、边界输入和较大输入分别验证。',
    pitfall: '只记模板，不理解循环不变量、终止条件和复杂度来源。'
  },
  系统与网络: {
    context: '系统问题通常跨越多个层级。把数据包、进程、内存页或事务的状态变化按时间顺序串起来，才能找到真正的故障边界。',
    action: '画出参与者、状态变化和发生顺序。',
    pitfall: '只观察最终错误信息，没有检查上游状态和中间层。'
  },
  开发工具: {
    context: '工具的目标是缩短反馈时间并保留证据。比记住命令更重要的是理解输入文件、生成结果、退出状态和失败时去哪里查看。',
    action: '把命令、预期输出和验证方法一起记录。',
    pitfall: '复制命令后不理解作用范围，意外修改错误的文件或环境。'
  },
  项目实践: {
    context: '项目实践要把个人经验变成团队可重复的流程。每一步都应有负责人、输入、输出和完成标准，并为失败保留恢复路径。',
    action: '把步骤交给不了解背景的人试走一遍。',
    pitfall: '文档只描述理想流程，没有覆盖失败、回滚和交接。'
  },
  'Web 与安全': {
    context: 'Web 的关键边界是浏览器、网络与服务端之间的信任关系。语义、状态和安全策略需要协同设计，不能依赖单一前端检查。',
    action: '分别从普通用户、键盘用户和恶意输入三个角度验证。',
    pitfall: '只验证视觉结果，没有检查语义、请求和服务端授权。'
  },
  数据与智能: {
    context: '数据流程的每一步都会影响结论。需要记录样本来源、处理方式、模型版本与评估口径，避免不可复现或被泄漏污染的结果。',
    action: '保留基线，并对失败样本做分类分析。',
    pitfall: '只追求总分提升，没有确认指标是否代表真实目标。'
  }
}

const TOPIC_GUIDES = [
  [/指针|引用|生命周期|智能指针|RAII|move|所有权/, '重点是区分对象本身、访问对象的句柄以及资源所有者。每一次保存引用或移动资源时，都要确认被引用对象是否仍然存活。', '最常见的问题是悬空引用、重复释放，或在移动后继续假设源对象保留原值。', '画出示例中每个对象的创建、转移和销毁时间线。'],
  [/asyncio|协程|线程|并发|互斥|数据竞争|死锁/, '并发问题要从调度者、共享状态和先后关系理解。先确定哪些操作可能交错，再用同步原语建立明确的 happens-before 关系。', '把“运行得快”误认为“并行”，或在锁内执行慢操作，都会带来难以复现的问题。', '人为加入延迟并重复运行，观察顺序变化与共享状态。'],
  [/HTTP|REST|DNS|TCP|UDP|请求|网络/, '网络调用是一条分层路径。名称解析、连接建立、加密、请求处理和缓存都可能独立失败，应结合状态码、时序和日志定位。', '只设置一个总超时，或无限重试非幂等请求，可能把局部故障放大为整条链路拥塞。', '使用浏览器网络面板或命令行工具记录一次完整请求的时序。'],
  [/数据库|索引|事务|SQLAlchemy|ER 图/, '数据库设计要同时考虑数据约束、查询路径和并发修改。索引优化读取却增加写入成本，事务保证一致性却会扩大锁范围。', '只看单条查询速度而忽略写入、锁等待和数据一致性，容易得到局部最优。', '为一个真实查询写出执行计划，并说明索引与事务边界。'],
  [/二分|复杂度|BFS|DFS|动态规划|数据结构|vector|栈、队列|哈希/, '算法的核心不是模板，而是状态、不变量与收缩规则。明确每一步排除了什么可能性，才能证明结果和终止条件。', '边界区间定义不一致、重复访问节点或状态含义模糊，是最常见的错误来源。', '用空输入、单元素、重复元素和最大规模输入各验证一次。'],
  [/Git|分支|冲突|代码评审/, '版本控制记录的是一组可追溯的变更关系。提交应当围绕一个目标，冲突解决要理解双方意图，评审要关注正确性与验证证据。', '用强制覆盖快速消除冲突，可能悄悄丢失他人的有效修改。', '创建两个分支修改同一处内容，完整演练冲突分析、解决和验证。'],
  [/Linux|GDB|Sanitizer|调试|日志|可观察|性能/, '排障要先保留现场，再沿着现象、时间线和依赖逐步缩小范围。工具输出是证据，不是结论，需要与代码路径对应。', '同时改动多个变量或忽略第一条错误，会让真正原因被后续噪声掩盖。', '记录一个可重复的故障场景，并写出从现象到根因的证据链。'],
  [/Docker|部署|CI|自动化|CMake|构建/, '构建与部署的目标是从同一输入稳定得到同一产物。依赖、配置、产物和运行环境应有清晰边界，并能在失败后恢复。', '依赖本机缓存或隐含环境变量，会造成“只有我的电脑能运行”。', '在干净目录或容器中重新执行全流程，确认没有隐藏依赖。'],
  [/HTML|语义|无障碍/, '语义元素同时向浏览器、键盘和辅助技术表达结构。正确元素自带交互行为，通常比用 div 模拟更可靠。', '只有视觉样式而缺少名称、焦点和键盘行为，会让功能对部分用户不可用。', '只使用键盘完成一次页面主要任务，并检查焦点顺序。'],
  [/CSS|Flex|Grid|响应式/, '布局应该由内容关系决定：一维分布使用 Flex，二维行列使用 Grid，断点来自内容开始拥挤的时刻。', '用大量固定宽度和绝对定位修补页面，会在文本变长或屏幕变窄时崩坏。', '把视口缩到 320px，再把文字放大 200%，检查内容是否仍可读。'],
  [/Cookie|Session|JWT|XSS|CSRF|安全/, '安全设计要明确谁能伪造输入、令牌保存在哪里、服务端如何重新验证身份和权限。不同防护措施解决的是不同攻击路径。', '把编码、认证和授权混为一谈，往往会留下绕过路径。', '列出攻击者可控制的输入，并说明每一层如何验证或限制它。'],
  [/机器学习|训练集|过拟合|标准化|归一化|混淆矩阵/, '机器学习结果依赖数据分布和评估设计。训练、选择模型和最终评估必须使用相互隔离的数据，并用适合任务的指标解释。', '反复查看测试集并据此调参，会把测试集变成训练过程的一部分。', '保留一个简单基线，比较训练集与验证集上的差异并分析失败样本。'],
  [/RAG|向量|大模型|结构化输出|LLM/, '大模型应用不是单次提示词调用，而是检索、上下文组织、生成、验证和失败处理组成的系统。每一环都需要独立评估。', '把流畅的回答当作正确答案，或不验证结构化输出，会让错误静默进入后续流程。', '准备一组可判定答案的问题，分别测量召回质量和最终回答质量。'],
  [/pytest|GoogleTest|测试/, '测试应描述可观察行为，并清楚区分准备、执行和断言。一个失败最好只指向一个问题，边界与异常路径不能只靠人工尝试。', '测试过度依赖内部实现，会让安全重构也造成大量无意义失败。', '为正常、边界和失败路径各写一个独立用例。'],
  [/缓存|局部性/, '缓存利用重复访问和相邻访问减少昂贵操作。命中率、失效策略和数据一致性共同决定它是否真的有效。', '只看到读取变快，却没有设计更新后的失效方式，会返回长期过期的数据。', '记录命中率与延迟，并模拟一次底层数据更新。']
]

export function normalizeArticleList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  if (!value) return []
  return String(value)
    .split(/\r?\n|\s*\|\s*/)
    .map((item) => item.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
}

function topicGuide(article) {
  const haystack = [article.title, article.content, ...normalizeTags(article.tags)].join(' ')
  const matched = TOPIC_GUIDES.find(([pattern]) => pattern.test(haystack))
  if (!matched) return null
  return { explanation: matched[1], pitfall: matched[2], exercise: matched[3] }
}

export function buildArticleContent(article = {}) {
  const title = article.title || '这条知识'
  const domain = article.domain || '通用知识'
  const category = article.category || '知识整理'
  const tags = normalizeTags(article.tags)
  const domainGuide = DOMAIN_GUIDES[domain] || DEFAULT_GUIDE
  const categoryGuide = CATEGORY_GUIDES[category] || {
    context: '把概念放进真实问题中理解，比较不同选择的收益、限制与失败方式。',
    action: '使用一个最小场景验证结论。',
    pitfall: '只记住表面结论，没有确认适用条件。'
  }
  const topic = topicGuide(article) || {
    explanation: `“${title}”的价值不在于记住一段固定写法，而在于理解它解决的问题、使用前提和可以验证的结果。`,
    pitfall: `在没有明确问题边界时直接套用“${title}”，容易增加不必要的复杂度。`,
    exercise: `为“${title}”设计一个最小输入和一个失败输入，比较两次结果。`
  }
  const customPrinciple = String(article.principle || '').trim()
  const customPoints = normalizeArticleList(article.key_points)
  const customPitfalls = normalizeArticleList(article.pitfalls)
  const customExercises = normalizeArticleList(article.exercises)
  const focus = tags.slice(0, 3).join('、') || category

  return {
    file: domainGuide.file,
    objectives: [
      `能用自己的话解释“${title}”解决的核心问题。`,
      `能围绕${focus}判断它的适用条件与限制。`,
      `能运行最小示例，并通过改变输入验证边界行为。`
    ],
    principles: [
      customPrinciple || article.content || topic.explanation,
      customPrinciple ? article.content : topic.explanation,
      `${categoryGuide.context} ${domainGuide.principle}`
    ].filter((paragraph, index, all) => paragraph && all.indexOf(paragraph) === index),
    keyPoints: customPoints.length ? customPoints : [
      topic.explanation,
      `观察重点：${focus}之间如何相互影响，而不是孤立记忆单个名词。`,
      categoryGuide.action
    ],
    steps: domainGuide.steps.map((body, index) => ({
      title: ['先定义问题边界', '再运行最小示例', '最后验证变化与失败'][index],
      body
    })),
    pitfalls: customPitfalls.length ? customPitfalls : [
      topic.pitfall,
      categoryGuide.pitfall,
      ...domainGuide.pitfalls
    ].filter((item, index, all) => all.indexOf(item) === index).slice(0, 4),
    exercises: customExercises.length ? customExercises : [
      `入门：运行示例并逐行解释它与“${title}”的关系。`,
      `进阶：${topic.exercise}`,
      `实践：把这个方法放入一个小项目，补充成功标准、失败处理和验证记录。`
    ],
    checklist: domainGuide.checklist,
    tip: `${domainGuide.steps[1]} 涉及版本差异时，请确认当前环境为 ${article.version || '对应版本'}。`
  }
}
