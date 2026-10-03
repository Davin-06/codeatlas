export const demoVersions = [
  { version: '3.12', name: 'Python 3.12', release_date: '2023-10-02', note: '类型系统与解释器性能' },
  { version: '3.11', name: 'Python 3.11', release_date: '2022-10-24', note: '异常组与性能跃升' },
  { version: 'C++23', name: 'C++23', release_date: '2024-10-19', note: '现代标准库与语言改进' },
  { version: 'C++20', name: 'C++20', release_date: '2020-12-15', note: '协程、概念与范围' },
  { version: '通用', name: '计算机通识', release_date: '', note: '系统、网络与算法基础' }
]

export const demoDomains = [
  { name: 'Python', slug: 'Python', description: '语法、常用库、Web 与自动化', count: 16, symbol: 'Py' },
  { name: 'C++', slug: 'C++', description: '现代 C++、STL、内存与并发', count: 14, symbol: 'C+' },
  { name: '计算机基础', slug: '计算机基础', description: '算法、网络、系统与数据库', count: 18, symbol: 'CS' },
  { name: '工程实践', slug: '工程实践', description: 'Git、Linux、调试与项目协作', count: 12, symbol: '⚙' },
  { name: 'Web 开发', slug: 'Web 开发', description: '浏览器、前后端、接口与安全', count: 8, symbol: 'W3' },
  { name: 'AI 与数据', slug: 'AI 与数据', description: '数据处理、机器学习与大模型', count: 6, symbol: 'AI' }
]

export const demoCategories = [
  { name: '语言基础', description: '语法、类型系统和语言特性', count: 14, symbol: '{}' },
  { name: '算法与数据结构', description: '复杂度、经典结构与解题方法', count: 8, symbol: 'O(n)' },
  { name: '系统与网络', description: '操作系统、网络和计算机组成', count: 14, symbol: '01' },
  { name: '开发工具', description: 'Git、Linux、构建、调试与编辑器', count: 13, symbol: '>_' },
  { name: '项目实践', description: '从想法到可协作交付的完整项目', count: 12, symbol: '↗' },
  { name: 'Web 与安全', description: '浏览器、接口设计与常见安全边界', count: 7, symbol: '://'},
  { name: '数据与智能', description: '数据分析、机器学习与模型应用', count: 6, symbol: 'Σ' }
]

export const demoKnowledge = [
  {
    id: 1, domain: 'Python', level: '入门', title: '用海象运算符收紧读取循环',
    content: 'Python 3.8 引入了赋值表达式 :=。它适合在判断条件中复用刚刚计算出的值，减少重复调用，同时让读取循环更紧凑。',
    version: '3.8', category: '语言基础', tags: ['语法', '可读性', 'PEP 572'], author: '知图编辑组',
    created_at: '2026-09-21', reading_time: 4, code: "while chunk := file.read(8192):\n    process(chunk)"
  },
  {
    id: 2, domain: 'Python', level: '入门', title: '字典合并：从 update 到 | 运算符',
    content: '比较 |、|= 与 update 的副作用、优先级和适用边界，避免在配置合并时意外修改原字典。',
    version: '3.9', category: '语言基础', tags: ['字典', '新特性', 'PEP 584'], author: '知图编辑组',
    created_at: '2026-09-19', reading_time: 5, code: "defaults = {'theme': 'light'}\nuser = {'theme': 'dark'}\nconfig = defaults | user"
  },
  {
    id: 3, domain: 'Python', level: '进阶', title: '模式匹配不是 switch：match 的正确心智模型',
    content: '结构化模式匹配能够解构序列、映射与类。把它当作数据形状的声明，而不只是更漂亮的条件分支。',
    version: '3.10', category: '语言基础', tags: ['match', '控制流', 'PEP 634'], author: 'Lin',
    created_at: '2026-09-18', reading_time: 7, code: "match response:\n    case {'status': 200, 'data': data}:\n        return data\n    case {'status': code}:\n        raise ApiError(code)"
  },
  {
    id: 4, domain: 'Python', level: '进阶', title: 'ExceptionGroup：一次处理多个失败',
    content: '并发任务可能同时失败。Python 3.11 的 ExceptionGroup 与 except* 让批量错误处理具备结构。',
    version: '3.11', category: '语言基础', tags: ['异常', '并发', 'PEP 654'], author: 'Mori',
    created_at: '2026-09-16', reading_time: 6, code: "try:\n    await run_tasks()\nexcept* ValueError as errors:\n    report(errors.exceptions)"
  },
  {
    id: 5, domain: 'Python', level: '进阶', title: 'Python 3.12 的类型参数新语法',
    content: '用更轻量的方式声明泛型类和泛型函数，并理解 type 语句如何改善大型项目的类型表达。',
    version: '3.12', category: '语言基础', tags: ['typing', '泛型', 'PEP 695'], author: '知图编辑组',
    created_at: '2026-09-14', reading_time: 8, code: "def first[T](items: list[T]) -> T:\n    return items[0]\n\ntype Point = tuple[float, float]"
  },
  {
    id: 6, domain: 'Python', level: '进阶', title: '用 Pandas 管道重写数据清洗流程',
    content: '通过 assign、query 与 pipe 把数据清洗写成从上到下可阅读、可组合、可测试的转换链。',
    version: '3.10', category: '项目实践', tags: ['Pandas', '数据分析', 'pipeline'], author: 'Sora',
    created_at: '2026-09-12', reading_time: 9, code: "result = (df\n    .dropna(subset=['email'])\n    .assign(domain=lambda x: x.email.str.split('@').str[-1])\n    .query('active'))"
  },
  {
    id: 7, domain: 'Python', level: '项目', title: 'FastAPI 依赖注入的三个实际用法',
    content: '从数据库会话、权限校验到请求上下文，掌握 Depends 在真实项目中的组合方式。',
    version: '3.11', category: '项目实践', tags: ['FastAPI', '依赖注入', 'API'], author: 'Lin',
    created_at: '2026-09-10', reading_time: 10, code: "@app.get('/profile')\ndef profile(user = Depends(current_user)):\n    return user"
  },
  {
    id: 8, domain: 'Python', level: '项目', title: 'pyproject.toml 的最小可用配置',
    content: '统一项目元数据、构建系统与工具配置，告别散落在 setup.py 和多个点文件里的重复信息。',
    version: '3.11', category: '开发工具', tags: ['pyproject', '依赖', '构建'], author: 'Mori',
    created_at: '2026-09-08', reading_time: 6, code: "[project]\nname = 'my-package'\nversion = '0.1.0'\nrequires-python = '>=3.11'"
  },
  {
    id: 9, domain: 'Python', level: '进阶', title: 'Requests 超时、重试与会话复用',
    content: '给 HTTP 客户端补上生产环境必须的超时、重试策略和连接池，避免一个请求拖垮整条链路。',
    version: '3.10', category: '系统与网络', tags: ['Requests', 'HTTP', '可靠性'], author: 'Sora',
    created_at: '2026-09-05', reading_time: 8, code: "with requests.Session() as client:\n    response = client.get(url, timeout=(3.05, 10))\n    response.raise_for_status()"
  },
  {
    id: 10, domain: 'Python', level: '入门', title: '用 pathlib 替代字符串拼路径',
    content: '使用面向对象的路径 API 处理读取、遍历与跨平台路径拼接，让文件操作更安全。',
    version: '3.9', category: '开发工具', tags: ['pathlib', '文件系统', '标准库'], author: '知图编辑组',
    created_at: '2026-09-03', reading_time: 5, code: "config = Path.home() / '.config' / 'app.json'\nif config.exists():\n    data = json.loads(config.read_text())"
  },
  {
    id: 101, domain: 'C++', level: '入门', title: '引用、指针与对象生命周期',
    content: '从内存模型出发区分引用与指针，理解悬空引用、空指针以及什么时候应该使用智能指针。',
    version: 'C++17', category: '语言基础', tags: ['指针', '引用', '生命周期'], author: 'C++ 学习组',
    created_at: '2026-09-24', reading_time: 10, code: "auto value = std::make_unique<int>(42);\nstd::cout << *value << '\\n';"
  },
  {
    id: 102, domain: 'C++', level: '进阶', title: 'RAII：让资源跟着对象走',
    content: '利用构造函数获取资源、析构函数释放资源，把文件、锁和内存的清理变成编译器可保证的行为。',
    version: 'C++17', category: '语言基础', tags: ['RAII', '资源管理', '异常安全'], author: 'C++ 学习组',
    created_at: '2026-09-23', reading_time: 9, code: "std::lock_guard<std::mutex> lock(mutex);\nupdate_shared_state();"
  },
  {
    id: 103, domain: 'C++', level: '入门', title: 'vector 扩容时发生了什么',
    content: '理解 size、capacity、迭代器失效和移动构造，写出性能稳定且不引用失效对象的容器代码。',
    version: 'C++17', category: '算法与数据结构', tags: ['STL', 'vector', '内存'], author: 'Nan',
    created_at: '2026-09-20', reading_time: 8, code: "std::vector<int> values;\nvalues.reserve(1000);\nvalues.push_back(42);"
  },
  {
    id: 104, domain: 'C++', level: '进阶', title: '用 concepts 写出可读的模板约束',
    content: 'C++20 Concepts 能把模板报错提前到接口边界，让泛型代码的要求像普通函数参数一样清晰。',
    version: 'C++20', category: '语言基础', tags: ['concepts', '模板', '泛型'], author: 'C++ 学习组',
    created_at: '2026-09-17', reading_time: 11, code: "template<std::integral T>\nT twice(T value) {\n    return value * 2;\n}"
  },
  {
    id: 105, domain: 'C++', level: '进阶', title: 'move 并不移动：值类别与移动语义',
    content: 'std::move 只是一次类型转换。真正的资源转移发生在移动构造或移动赋值中。',
    version: 'C++17', category: '语言基础', tags: ['move', '右值', '性能'], author: 'Nan',
    created_at: '2026-09-15', reading_time: 12, code: "std::string source = 'club';\nauto target = std::move(source);"
  },
  {
    id: 106, domain: 'C++', level: '项目', title: '用 CMake 组织一个多目录项目',
    content: '从 target 出发组织库、可执行文件和测试，让依赖关系成为构建系统里可检查的图。',
    version: 'C++20', category: '开发工具', tags: ['CMake', '构建', '项目结构'], author: 'C++ 学习组',
    created_at: '2026-09-13', reading_time: 9, code: "add_library(core src/core.cpp)\ntarget_include_directories(core PUBLIC include)\ntarget_link_libraries(app PRIVATE core)"
  },
  {
    id: 107, domain: 'C++', level: '进阶', title: '线程、互斥量与数据竞争',
    content: '理解 happens-before、临界区和原子操作，学会用 ThreadSanitizer 找出难以复现的数据竞争。',
    version: 'C++20', category: '系统与网络', tags: ['并发', 'mutex', '数据竞争'], author: 'C++ 学习组',
    created_at: '2026-09-11', reading_time: 13, code: "std::jthread worker([&] {\n    std::scoped_lock lock(mutex);\n    ++counter;\n});"
  },
  {
    id: 108, domain: 'C++', level: '项目', title: 'GDB 从崩溃现场定位越界访问',
    content: '从 core dump、调用栈到条件断点，建立一条可重复的原生程序崩溃排查流程。',
    version: '通用', category: '开发工具', tags: ['GDB', '调试', '崩溃'], author: 'Nan',
    created_at: '2026-09-09', reading_time: 10, code: "gdb ./app core\n(gdb) bt\n(gdb) frame 2\n(gdb) print index"
  },
  {
    id: 201, domain: '计算机基础', level: '入门', title: '大 O 复杂度到底在比较什么',
    content: '复杂度描述输入规模增长时资源消耗的趋势，而不是一次运行用了多少毫秒。用常见代码建立数量级直觉。',
    version: '通用', category: '算法与数据结构', tags: ['复杂度', 'Big O', '算法'], author: '算法学习组',
    created_at: '2026-09-26', reading_time: 8, code: "for i in range(n):\n    for j in range(n):\n        visit(i, j)  # O(n²)"
  },
  {
    id: 202, domain: '计算机基础', level: '入门', title: '从数组到哈希表：如何选择数据结构',
    content: '根据访问方式、修改频率与内存开销选择容器，而不是死记每种结构的定义。',
    version: '通用', category: '算法与数据结构', tags: ['数组', '链表', '哈希表'], author: '算法学习组',
    created_at: '2026-09-22', reading_time: 10, code: "查询多、顺序稳定 → 数组\n按键快速定位 → 哈希表\n频繁头尾操作 → 双端队列"
  },
  {
    id: 203, domain: '计算机基础', level: '进阶', title: '一条 HTTP 请求经过了什么',
    content: '从 DNS、TCP/TLS 握手到反向代理和应用服务器，串起浏览器访问网站背后的完整网络路径。',
    version: '通用', category: '系统与网络', tags: ['HTTP', 'DNS', 'TCP'], author: '网络学习组',
    created_at: '2026-09-20', reading_time: 12, code: "DNS → TCP → TLS → HTTP\n浏览器 → CDN → 反向代理 → 应用"
  },
  {
    id: 204, domain: '计算机基础', level: '进阶', title: '进程、线程和协程的边界',
    content: '从调度者、地址空间和切换成本三个角度比较三种并发单元，避免把异步等同于并行。',
    version: '通用', category: '系统与网络', tags: ['进程', '线程', '协程'], author: '系统学习组',
    created_at: '2026-09-18', reading_time: 11, code: "进程：独立地址空间\n线程：共享进程资源\n协程：用户态协作调度"
  },
  {
    id: 205, domain: '计算机基础', level: '进阶', title: '数据库索引为什么能加速查询',
    content: '借助 B+ 树理解页、回表、联合索引和最左前缀，判断什么时候索引反而会增加成本。',
    version: '通用', category: '系统与网络', tags: ['数据库', '索引', 'B+树'], author: '系统学习组',
    created_at: '2026-09-16', reading_time: 13, code: "CREATE INDEX idx_member_score\nON members (club_id, score DESC);"
  },
  {
    id: 206, domain: '计算机基础', level: '入门', title: '二进制、补码与整数溢出',
    content: '从位权和补码表示理解有符号整数范围，以及为什么溢出在不同语言里可能产生不同结果。',
    version: '通用', category: '系统与网络', tags: ['二进制', '补码', '溢出'], author: '硬件学习组',
    created_at: '2026-09-14', reading_time: 9, code: "8 位有符号整数\n范围：-128 ~ 127\n-1 的补码：1111 1111"
  },
  {
    id: 207, domain: '计算机基础', level: '进阶', title: '缓存局部性：代码性能的隐藏维度',
    content: 'CPU 访问内存的成本并不相同。理解时间局部性和空间局部性，解释为什么连续遍历通常更快。',
    version: '通用', category: '系统与网络', tags: ['CPU', '缓存', '性能'], author: '硬件学习组',
    created_at: '2026-09-12', reading_time: 10, code: "// 行优先数组按行遍历\nfor (row : matrix)\n    for (value : row) consume(value);"
  },
  {
    id: 208, domain: '计算机基础', level: '项目', title: '从需求到 ER 图：设计社团活动数据库',
    content: '用成员、活动、报名和签到四个实体完成需求分析、关系建模、约束设计与查询验证。',
    version: '通用', category: '项目实践', tags: ['数据库', 'ER图', '项目'], author: '数据库学习组',
    created_at: '2026-09-08', reading_time: 15, code: "Member 1 ── N Registration N ── 1 Event\nRegistration(id, member_id, event_id, status)"
  },
  {
    id: 301, domain: '工程实践', level: '入门', title: 'Git 分支不是文件夹：社团协作工作流',
    content: '用功能分支、Pull Request 和代码评审组织多人协作，减少互相覆盖与无法追溯的改动。',
    version: '通用', category: '开发工具', tags: ['Git', '分支', '协作'], author: '社团技术部',
    created_at: '2026-09-25', reading_time: 9, code: "git switch -c feature/search\ngit add .\ngit commit -m 'feat: add search filters'"
  },
  {
    id: 302, domain: '工程实践', level: '入门', title: 'Linux 命令行排查服务问题',
    content: '从进程、端口、日志和资源占用四个方向建立排查顺序，而不是随机尝试命令。',
    version: 'Linux', category: '开发工具', tags: ['Linux', '日志', '排障'], author: '社团技术部',
    created_at: '2026-09-22', reading_time: 8, code: "ps aux | grep app\nss -lntp\ntail -f logs/app.log\nfree -h"
  },
  {
    id: 303, domain: '工程实践', level: '项目', title: '如何写一份别人能接手的 README',
    content: '围绕项目是什么、怎么启动、如何验证和常见问题组织文档，让新成员在十分钟内跑起来。',
    version: '通用', category: '项目实践', tags: ['README', '文档', '交接'], author: '社团技术部',
    created_at: '2026-09-19', reading_time: 7, code: "# 项目名称\n## 快速开始\n## 配置说明\n## 测试与部署\n## 常见问题"
  },
  {
    id: 304, domain: '工程实践', level: '进阶', title: '从日志到指标：让程序变得可观察',
    content: '区分日志、指标和链路追踪的职责，为错误保留上下文，为性能问题留下可比较的数据。',
    version: '通用', category: '项目实践', tags: ['日志', '监控', '可观测性'], author: '社团技术部',
    created_at: '2026-09-17', reading_time: 10, code: "logger.info('task_complete', extra={\n    'task_id': task.id,\n    'duration_ms': elapsed\n})"
  },
  {
    id: 305, domain: '工程实践', level: '项目', title: '代码评审到底应该看什么',
    content: '围绕正确性、可读性、边界条件和验证证据进行评审，而不是纠结每个人的个人格式偏好。',
    version: '通用', category: '项目实践', tags: ['Code Review', '质量', '协作'], author: '社团技术部',
    created_at: '2026-09-12', reading_time: 8, code: "评审顺序：\n1. 目标是否实现\n2. 边界是否覆盖\n3. 设计是否易维护\n4. 测试能否证明"
  },
  {
    id: 306, domain: '工程实践', level: '项目', title: '给社团项目建立自动化检查',
    content: '在每次提交时自动运行格式检查、测试和构建，把“在我电脑上能跑”变成所有人都能验证。',
    version: '通用', category: '开发工具', tags: ['CI', '测试', '自动化'], author: '社团技术部',
    created_at: '2026-09-10', reading_time: 11, code: "steps:\n  - run: npm ci\n  - run: npm test\n  - run: npm run build"
  },
  {
    id: 11, domain: 'Python', level: '入门', title: '列表推导式什么时候反而不该用',
    content: '用可读性而不是行数判断是否使用推导式；涉及多层嵌套、副作用或复杂分支时，普通循环通常更清楚。',
    version: '3.9', category: '语言基础', tags: ['列表推导式', '可读性', '循环'], author: '知图编辑组',
    created_at: '2026-09-29', reading_time: 6, code: "active_names = [\n    user.name for user in users\n    if user.is_active\n]"
  },
  {
    id: 12, domain: 'Python', level: '进阶', title: '装饰器：从闭包到可复用的横切逻辑',
    content: '理解装饰器如何包装函数，并用 functools.wraps 保留原函数信息，适合日志、计时和权限校验。',
    version: '3.10', category: '语言基础', tags: ['装饰器', '闭包', 'wraps'], author: '知图编辑组',
    created_at: '2026-09-28', reading_time: 9, code: "@functools.wraps(func)\ndef wrapper(*args, **kwargs):\n    return func(*args, **kwargs)"
  },
  {
    id: 13, domain: 'Python', level: '进阶', title: 'asyncio 并发不是多线程',
    content: '事件循环适合大量等待型任务；CPU 密集计算仍需要进程池或原生扩展，避免阻塞整个循环。',
    version: '3.11', category: '系统与网络', tags: ['asyncio', '协程', '并发'], author: 'Python 学习组',
    created_at: '2026-09-27', reading_time: 11, code: "results = await asyncio.gather(\n    fetch('/users'), fetch('/events')\n)"
  },
  {
    id: 14, domain: 'Python', level: '入门', title: 'pytest 的 Arrange—Act—Assert 写法',
    content: '把准备数据、执行行为和验证结果分开，让失败原因更容易定位，并用参数化减少重复用例。',
    version: '3.10', category: '开发工具', tags: ['pytest', '测试', 'AAA'], author: 'Python 学习组',
    created_at: '2026-09-26', reading_time: 7, code: "def test_total():\n    cart = Cart([10, 20])\n    assert cart.total() == 30"
  },
  {
    id: 15, domain: 'Python', level: '项目', title: '虚拟环境与依赖锁定的可靠工作流',
    content: '为每个项目隔离依赖，区分直接依赖与锁定结果，让开发机、CI 和服务器安装出相同环境。',
    version: '3.12', category: '开发工具', tags: ['venv', '依赖管理', 'uv'], author: 'Python 学习组',
    created_at: '2026-09-25', reading_time: 8, code: "python -m venv .venv\n.venv\\Scripts\\activate\npip install -r requirements.txt"
  },
  {
    id: 16, domain: 'Python', level: '项目', title: 'SQLAlchemy 事务边界应该放在哪里',
    content: '让一次业务操作共享一个明确事务，在成功时提交、异常时回滚，避免在底层函数里零散 commit。',
    version: '3.11', category: '项目实践', tags: ['SQLAlchemy', '事务', '数据库'], author: 'Python 学习组',
    created_at: '2026-09-24', reading_time: 10, code: "with Session.begin() as session:\n    session.add(order)\n    reserve_stock(session, order)"
  },
  {
    id: 109, domain: 'C++', level: '入门', title: 'const 到底约束了谁',
    content: '区分指向常量的指针、常量指针与 const 成员函数，把只读意图交给编译器检查。',
    version: 'C++17', category: '语言基础', tags: ['const', '指针', '接口设计'], author: 'C++ 学习组',
    created_at: '2026-09-29', reading_time: 8, code: "const int* view = &value;\nint* const handle = &value;"
  },
  {
    id: 110, domain: 'C++', level: '入门', title: '迭代器失效的常见现场',
    content: '容器扩容、插入和删除可能使迭代器或引用失效；修改容器时要按照容器规则接住新的迭代器。',
    version: 'C++17', category: '算法与数据结构', tags: ['迭代器', 'STL', '未定义行为'], author: 'C++ 学习组',
    created_at: '2026-09-28', reading_time: 9, code: "for (auto it = values.begin(); it != values.end();)\n    it = *it < 0 ? values.erase(it) : std::next(it);"
  },
  {
    id: 111, domain: 'C++', level: '进阶', title: 'unique_ptr、shared_ptr 怎么选',
    content: '默认使用唯一所有权；只有多个对象确实共同拥有生命周期时才使用 shared_ptr，观察关系使用引用或 weak_ptr。',
    version: 'C++17', category: '语言基础', tags: ['智能指针', '所有权', '生命周期'], author: 'C++ 学习组',
    created_at: '2026-09-27', reading_time: 10, code: "auto service = std::make_unique<Service>();\nrun(*service);"
  },
  {
    id: 112, domain: 'C++', level: '进阶', title: 'ranges 让数据变换更接近意图',
    content: '用视图组合过滤与变换，并理解惰性求值和生命周期，避免把临时对象悬空在 view 中。',
    version: 'C++20', category: '语言基础', tags: ['ranges', 'views', 'STL'], author: 'C++ 学习组',
    created_at: '2026-09-26', reading_time: 11, code: "auto even = values\n  | std::views::filter([](int n) { return n % 2 == 0; });"
  },
  {
    id: 113, domain: 'C++', level: '项目', title: 'AddressSanitizer 定位内存错误',
    content: '在测试构建中开启 ASan，快速捕获越界、释放后使用和重复释放，并从首个错误栈开始排查。',
    version: 'C++20', category: '开发工具', tags: ['ASan', '内存', '调试'], author: 'C++ 学习组',
    created_at: '2026-09-25', reading_time: 8, code: "cmake -S . -B build \\\n  -DCMAKE_CXX_FLAGS=-fsanitize=address"
  },
  {
    id: 114, domain: 'C++', level: '项目', title: '用 GoogleTest 写第一个单元测试',
    content: '以行为命名测试，覆盖正常、边界和异常路径，并让每个失败只说明一个清晰问题。',
    version: 'C++20', category: '开发工具', tags: ['GoogleTest', '测试', 'CMake'], author: 'C++ 学习组',
    created_at: '2026-09-24', reading_time: 7, code: "TEST(StackTest, EmptyStackHasNoTop) {\n  Stack stack;\n  EXPECT_TRUE(stack.empty());\n}"
  },
  {
    id: 209, domain: '计算机基础', level: '入门', title: '栈、队列与堆不是一回事',
    content: '区分抽象数据结构中的栈和队列，以及内存管理中的栈区与堆区，避免同名概念混淆。',
    version: '通用', category: '算法与数据结构', tags: ['栈', '队列', '堆'], author: '基础学习组',
    created_at: '2026-09-29', reading_time: 8, code: "栈：后进先出 LIFO\n队列：先进先出 FIFO\n堆：按优先级取极值"
  },
  {
    id: 210, domain: '计算机基础', level: '入门', title: '二分查找最容易错的边界',
    content: '统一闭区间或左闭右开写法，明确循环条件和更新规则，用空数组与单元素输入验证边界。',
    version: '通用', category: '算法与数据结构', tags: ['二分查找', '边界', '算法'], author: '算法学习组',
    created_at: '2026-09-28', reading_time: 8, code: "while left <= right:\n    mid = left + (right - left) // 2\n    # 收缩到 mid 左侧或右侧"
  },
  {
    id: 211, domain: '计算机基础', level: '进阶', title: 'BFS 与 DFS 应该怎么选',
    content: '最短步数和分层遍历优先 BFS；需要回溯、枚举路径或深入结构时常用 DFS，并注意深度上限。',
    version: '通用', category: '算法与数据结构', tags: ['BFS', 'DFS', '图'], author: '算法学习组',
    created_at: '2026-09-27', reading_time: 10, code: "queue = deque([start])\nwhile queue:\n    node = queue.popleft()"
  },
  {
    id: 212, domain: '计算机基础', level: '进阶', title: '动态规划：先写状态，再写转移',
    content: '先说明 dp 状态代表什么、初始值是什么、从哪些已知状态转移，再考虑空间压缩。',
    version: '通用', category: '算法与数据结构', tags: ['动态规划', '状态转移', '背包'], author: '算法学习组',
    created_at: '2026-09-26', reading_time: 12, code: "dp[0] = 0\nfor i in range(1, n + 1):\n    dp[i] = min(dp[i - step] + 1 for step in choices)"
  },
  {
    id: 213, domain: '计算机基础', level: '入门', title: 'TCP 与 UDP 的真正区别',
    content: '从连接状态、可靠性、消息边界和拥塞控制比较两者，而不是简单理解成一个快、一个慢。',
    version: '通用', category: '系统与网络', tags: ['TCP', 'UDP', '网络'], author: '网络学习组',
    created_at: '2026-09-25', reading_time: 9, code: "TCP：可靠字节流、有连接\nUDP：数据报、无连接、应用自定可靠性"
  },
  {
    id: 214, domain: '计算机基础', level: '进阶', title: 'DNS 缓存为什么让域名改了还不生效',
    content: '解析结果会停留在浏览器、系统、递归解析器和 CDN 多层缓存中，TTL 决定多数缓存的存活时间。',
    version: '通用', category: '系统与网络', tags: ['DNS', 'TTL', '缓存'], author: '网络学习组',
    created_at: '2026-09-24', reading_time: 8, code: "nslookup example.com\ndig example.com A +trace"
  },
  {
    id: 215, domain: '计算机基础', level: '进阶', title: '虚拟内存如何隔离进程',
    content: '每个进程看到独立虚拟地址空间，页表把虚拟页映射到物理页，并通过权限位提供隔离与共享。',
    version: '通用', category: '系统与网络', tags: ['虚拟内存', '页表', '操作系统'], author: '系统学习组',
    created_at: '2026-09-23', reading_time: 12, code: "虚拟地址 → 页号 + 页内偏移\n页表 → 物理页框 + 权限"
  },
  {
    id: 216, domain: '计算机基础', level: '进阶', title: '死锁的四个条件与处理策略',
    content: '互斥、占有等待、不可抢占和循环等待同时成立才会死锁；工程上常通过固定加锁顺序破坏循环。',
    version: '通用', category: '系统与网络', tags: ['死锁', '并发', '锁'], author: '系统学习组',
    created_at: '2026-09-22', reading_time: 10, code: "# 所有线程遵守同一顺序\nlock(account_a)\nlock(account_b)"
  },
  {
    id: 217, domain: '计算机基础', level: '进阶', title: '数据库事务的 ACID 与隔离级别',
    content: '用脏读、不可重复读和幻读理解隔离强度，并根据一致性需求与并发成本选择级别。',
    version: '通用', category: '系统与网络', tags: ['事务', 'ACID', '数据库'], author: '数据库学习组',
    created_at: '2026-09-21', reading_time: 12, code: "BEGIN;\nUPDATE accounts SET balance = balance - 100 WHERE id = 1;\nCOMMIT;"
  },
  {
    id: 218, domain: '计算机基础', level: '入门', title: '字符编码：UTF-8 为什么会出现乱码',
    content: '文本必须以相同编码写入和读取；乱码通常是字节正确但解释方式错误，而不是字符凭空损坏。',
    version: '通用', category: '系统与网络', tags: ['UTF-8', 'Unicode', '编码'], author: '基础学习组',
    created_at: '2026-09-20', reading_time: 7, code: "text.encode('utf-8')   # 字符 → 字节\ndata.decode('utf-8')   # 字节 → 字符"
  },
  {
    id: 307, domain: '工程实践', level: '入门', title: 'Git 冲突不是错误：一套安全解决流程',
    content: '先理解两边改动意图，再逐文件合并并运行测试；不要为了消除标记而盲目保留某一侧。',
    version: '通用', category: '开发工具', tags: ['Git', '冲突', '合并'], author: '工程学习组',
    created_at: '2026-09-29', reading_time: 8, code: "git status\n# 编辑冲突文件并测试\ngit add .\ngit commit"
  },
  {
    id: 308, domain: '工程实践', level: '入门', title: '环境变量与配置文件怎么分工',
    content: '把随环境变化或敏感的值放在环境变量，把可公开的默认行为放在配置文件，避免密钥进入版本库。',
    version: '通用', category: '项目实践', tags: ['环境变量', '配置', '密钥'], author: '工程学习组',
    created_at: '2026-09-28', reading_time: 7, code: "DATABASE_URL=postgres://...\nLOG_LEVEL=info\n# 不要提交真实 .env"
  },
  {
    id: 309, domain: '工程实践', level: '进阶', title: 'Docker 镜像为什么要分阶段构建',
    content: '构建阶段安装工具并产生产物，运行阶段只复制必要文件，从而减小镜像体积和攻击面。',
    version: 'Docker', category: '开发工具', tags: ['Docker', '镜像', '部署'], author: '工程学习组',
    created_at: '2026-09-27', reading_time: 9, code: "FROM node:22 AS build\nRUN npm ci && npm run build\nFROM nginx:alpine\nCOPY --from=build /app/dist /usr/share/nginx/html"
  },
  {
    id: 310, domain: '工程实践', level: '项目', title: 'API 错误信息应该包含什么',
    content: '稳定错误码用于程序判断，简明消息帮助人理解，请求标识便于查日志；不要向客户端泄露堆栈。',
    version: '通用', category: '项目实践', tags: ['API', '错误处理', '可观测性'], author: '工程学习组',
    created_at: '2026-09-26', reading_time: 8, code: "{\n  \"code\": \"INVALID_EMAIL\",\n  \"message\": \"邮箱格式不正确\",\n  \"request_id\": \"req_123\"\n}"
  },
  {
    id: 311, domain: '工程实践', level: '项目', title: '上线前的最小检查清单',
    content: '至少验证构建、测试、环境配置、数据备份、回滚方式和监控入口，让发布具备可恢复性。',
    version: '通用', category: '项目实践', tags: ['部署', '检查清单', '回滚'], author: '工程学习组',
    created_at: '2026-09-25', reading_time: 7, code: "□ 构建与测试通过\n□ 配置已核对\n□ 数据已备份\n□ 回滚步骤可执行\n□ 错误监控可用"
  },
  {
    id: 312, domain: '工程实践', level: '进阶', title: '性能优化先测量什么',
    content: '先用可重复场景定位耗时、吞吐或内存瓶颈，再针对热点优化；不要用直觉重写不在关键路径的代码。',
    version: '通用', category: '项目实践', tags: ['性能', '基准测试', 'Profiler'], author: '工程学习组',
    created_at: '2026-09-24', reading_time: 10, code: "基线 → 定位热点 → 单点修改 → 复测\n记录：输入规模、环境、P50/P95"
  },
  {
    id: 401, domain: 'Web 开发', level: '入门', title: 'HTML 语义化不只是为了 SEO',
    content: '用 header、nav、main、article 和 button 表达结构，让键盘、读屏器和搜索引擎都能正确理解页面。',
    version: 'Web', category: 'Web 与安全', tags: ['HTML', '语义化', '无障碍'], author: 'Web 学习组',
    created_at: '2026-09-29', reading_time: 7, code: "<main>\n  <article>...</article>\n</main>"
  },
  {
    id: 402, domain: 'Web 开发', level: '入门', title: 'Flex 与 Grid 的选择方法',
    content: '一维排列优先 Flex，行列同时受控时使用 Grid；从内容关系出发，而不是背固定布局模板。',
    version: 'Web', category: 'Web 与安全', tags: ['CSS', 'Flexbox', 'Grid'], author: 'Web 学习组',
    created_at: '2026-09-28', reading_time: 8, code: ".list { display: flex; gap: 1rem; }\n.gallery { display: grid; grid-template-columns: repeat(3, 1fr); }"
  },
  {
    id: 403, domain: 'Web 开发', level: '进阶', title: '浏览器从 URL 到页面发生了什么',
    content: '网络请求拿到资源后，浏览器解析 HTML 与 CSS、构建渲染树、布局并绘制，脚本还可能触发后续更新。',
    version: 'Web', category: 'Web 与安全', tags: ['浏览器', '渲染', 'DOM'], author: 'Web 学习组',
    created_at: '2026-09-27', reading_time: 12, code: "HTML → DOM ┐\nCSS  → CSSOM ┴→ Render Tree → Layout → Paint"
  },
  {
    id: 404, domain: 'Web 开发', level: '进阶', title: 'REST API 的资源与状态码',
    content: 'URL 表达资源，HTTP 方法表达动作，状态码说明结果；保持接口语义一致比追求形式纯粹更重要。',
    version: 'HTTP', category: 'Web 与安全', tags: ['REST', 'HTTP', 'API'], author: 'Web 学习组',
    created_at: '2026-09-26', reading_time: 9, code: "GET /articles/42     # 200\nPOST /articles       # 201\nDELETE /articles/42  # 204"
  },
  {
    id: 405, domain: 'Web 开发', level: '进阶', title: 'Cookie、Session 与 JWT 的边界',
    content: 'Cookie 是浏览器存储与传输机制，Session 是服务端状态方案，JWT 是令牌格式；三者不是互斥同类。',
    version: 'Web', category: 'Web 与安全', tags: ['Cookie', 'Session', 'JWT'], author: 'Web 学习组',
    created_at: '2026-09-25', reading_time: 11, code: "Set-Cookie: session=abc; HttpOnly; Secure; SameSite=Lax"
  },
  {
    id: 406, domain: 'Web 开发', level: '项目', title: 'XSS 与 CSRF 分别在攻击什么',
    content: 'XSS 让恶意脚本进入可信页面，CSRF 借用已登录身份发请求；输出转义、内容策略和同站 Cookie 各有职责。',
    version: 'Web', category: 'Web 与安全', tags: ['XSS', 'CSRF', '安全'], author: '安全学习组',
    created_at: '2026-09-24', reading_time: 12, code: "Content-Security-Policy: default-src 'self'\nSet-Cookie: sid=...; HttpOnly; SameSite=Lax"
  },
  {
    id: 407, domain: 'Web 开发', level: '项目', title: '前端状态应该放在哪里',
    content: '临时交互状态留在组件，跨页面共享且有明确生命周期的数据再进入全局状态，服务器数据交给请求缓存管理。',
    version: 'Vue 3', category: '项目实践', tags: ['状态管理', 'Vue', 'Pinia'], author: 'Web 学习组',
    created_at: '2026-09-23', reading_time: 9, code: "const query = ref('')       // 组件状态\nconst user = useUserStore() // 跨页面状态"
  },
  {
    id: 408, domain: 'Web 开发', level: '项目', title: '响应式页面的三个断点思路',
    content: '断点应来自内容何时拥挤：先保证阅读宽度，再调整布局结构，最后处理触控尺寸和横向滚动。',
    version: 'Web', category: 'Web 与安全', tags: ['响应式', '移动端', 'CSS'], author: 'Web 学习组',
    created_at: '2026-09-22', reading_time: 8, code: "@media (max-width: 48rem) {\n  .layout { grid-template-columns: 1fr; }\n}"
  },
  {
    id: 501, domain: 'AI 与数据', level: '入门', title: '训练集、验证集和测试集怎么分',
    content: '训练集拟合参数，验证集选择方案，测试集只在最终评估时使用；数据泄漏会让分数虚高。',
    version: '通用', category: '数据与智能', tags: ['机器学习', '数据集', '数据泄漏'], author: 'AI 学习组',
    created_at: '2026-09-29', reading_time: 8, code: "train, temp = split(data, ratio=0.8)\nvalid, test = split(temp, ratio=0.5)"
  },
  {
    id: 502, domain: 'AI 与数据', level: '入门', title: '标准化与归一化不是一回事',
    content: '标准化把特征变成均值约零、方差约一；归一化常把范围缩放到固定区间，选择取决于模型与分布。',
    version: '通用', category: '数据与智能', tags: ['标准化', '归一化', '特征工程'], author: 'AI 学习组',
    created_at: '2026-09-28', reading_time: 7, code: "z = (x - mean) / std\nscaled = (x - min) / (max - min)"
  },
  {
    id: 503, domain: 'AI 与数据', level: '进阶', title: '过拟合时先检查什么',
    content: '先确认数据划分和指标，再增加数据、简化模型或正则化；训练分数高不代表真实场景表现好。',
    version: '通用', category: '数据与智能', tags: ['过拟合', '正则化', '评估'], author: 'AI 学习组',
    created_at: '2026-09-27', reading_time: 9, code: "if train_score >> valid_score:\n    check_leakage()\n    simplify_model()"
  },
  {
    id: 504, domain: 'AI 与数据', level: '进阶', title: '向量检索在 RAG 中做了什么',
    content: '把问题与资料片段映射为向量，按相似度找出上下文，再交给模型生成；切分和召回质量决定答案上限。',
    version: '通用', category: '数据与智能', tags: ['RAG', '向量检索', 'Embedding'], author: 'AI 学习组',
    created_at: '2026-09-26', reading_time: 11, code: "query_vec = embed(question)\nchunks = index.search(query_vec, top_k=5)\nanswer = generate(question, chunks)"
  },
  {
    id: 505, domain: 'AI 与数据', level: '项目', title: '大模型应用为什么需要结构化输出',
    content: '让模型按明确 schema 返回数据，并在程序侧验证与重试，避免直接解析自然语言造成脆弱流程。',
    version: '通用', category: '数据与智能', tags: ['LLM', 'JSON Schema', '验证'], author: 'AI 学习组',
    created_at: '2026-09-25', reading_time: 9, code: "{\n  \"type\": \"object\",\n  \"required\": [\"answer\", \"sources\"]\n}"
  },
  {
    id: 506, domain: 'AI 与数据', level: '项目', title: '用混淆矩阵理解分类结果',
    content: '准确率可能掩盖少数类问题；结合真正例、假正例、假负例计算精确率与召回率。',
    version: '通用', category: '数据与智能', tags: ['混淆矩阵', '精确率', '召回率'], author: 'AI 学习组',
    created_at: '2026-09-24', reading_time: 8, code: "precision = TP / (TP + FP)\nrecall = TP / (TP + FN)"
  }
]

export function normalizeTags(tags) {
  if (Array.isArray(tags)) return tags
  if (typeof tags !== 'string') return []
  try {
    const parsed = JSON.parse(tags)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return tags.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)
  }
}

export function filterKnowledge(items, {
  domain = '',
  version = '',
  category = '',
  level = '',
  keyword = ''
} = {}) {
  const term = keyword.trim().toLocaleLowerCase('zh-CN')
  return items.filter((item) => {
    const matchesDomain = !domain || item.domain === domain
    const matchesVersion = !version || item.version === version
    const matchesCategory = !category || item.category === category
    const matchesLevel = !level || item.level === level
    const structuredContent = [item.principle, item.key_points, item.pitfalls, item.exercises]
      .flatMap((value) => Array.isArray(value) ? value : [value])
      .filter(Boolean)
    const haystack = [item.title, item.content, item.domain, item.category, item.version, ...normalizeTags(item.tags), ...structuredContent]
      .join(' ')
      .toLocaleLowerCase('zh-CN')
    return matchesDomain && matchesVersion && matchesCategory && matchesLevel && (!term || haystack.includes(term))
  })
}

export function filterDemoKnowledge(filters = {}) {
  return filterKnowledge(demoKnowledge, filters)
}
