window.LEGACY_NOTES = [
  {
    id: "legacy01",
    category: "C++",
    title: "C++数据结构与算法",
    date: "2023-05-16",
    status: "旧稿归档",
    tags: ["C++", "数据结构"],
    summary: "从线性表、数组与矩阵出发，整理常见数据结构的抽象定义、存储方式、基本操作与 C++ 实现。",
    code: "template<class T>\nclass linearList;",
    contentSrc: "assets/notes/legacy/cpp-data-structures.md"
  },
  {
    id: "legacy02",
    category: "C++",
    title: "Effective C++",
    date: "2023-04-25",
    status: "旧稿归档",
    tags: ["C++", "工程实践"],
    summary: "围绕对象初始化、const、构造与析构、继承和模板等主题，对《Effective C++》条款进行系统整理。",
    code: "const Rational operator*(const Rational& lhs, const Rational& rhs);",
    contentSrc: "assets/notes/legacy/effective-cpp.md"
  },
  {
    id: "legacy03",
    category: "游戏开发",
    title: "UE4学习笔记",
    date: "2023-03-27",
    status: "旧稿归档",
    tags: ["Unreal Engine", "Blueprint"],
    summary: "以第一人称射击原型为线索，记录材质、碰撞、移动、HUD、射击系统、胜利条件与敌人 AI 的实现过程。",
    code: "OnComponentBeginOverlap",
    contentSrc: "assets/notes/legacy/ue4-learning.md"
  },
  {
    id: "legacy04",
    category: "AI & Python",
    title: "从入门到入门的 Python",
    date: "2023-04-23",
    status: "旧稿归档",
    tags: ["Python", "基础语法"],
    summary: "一份轻量的 Python 入门记录，覆盖流程控制、函数、容器、包、JSON 与基础数据可视化。",
    code: "name = input()\nprint(f\"Hello, {name}\")",
    contentSrc: "assets/notes/legacy/python-basics.md"
  },
  {
    id: "legacy05",
    category: "C++",
    title: "STL：vector 与迭代器",
    date: "2023-04-04",
    status: "旧稿归档",
    tags: ["C++", "STL", "vector"],
    summary: "整理 vector 模板类的常用操作、迭代器模型，以及基于范围的 for 循环等现代 C++ 用法。",
    code: "vector<int>::iterator iter = values.begin();",
    contentSrc: "assets/notes/legacy/stl-vector-iterators.md"
  },
  {
    id: "legacy06",
    category: "C++",
    title: "STL：智能指针模板类",
    date: "2023-04-04",
    status: "旧稿归档",
    tags: ["C++", "STL", "智能指针"],
    summary: "从资源释放问题出发，对 auto_ptr、unique_ptr、shared_ptr 等智能指针的使用边界进行梳理。",
    code: "std::unique_ptr<int> value(new int(7));",
    contentSrc: "assets/notes/legacy/stl-smart-pointers.md"
  },
  {
    id: "legacy07",
    category: "C++",
    title: "STL：迭代器的概念、改进与模型",
    date: "2023-04-05",
    status: "旧稿归档",
    tags: ["C++", "STL", "迭代器"],
    summary: "从泛型编程中的概念与模型继续深入迭代器，并记录 copy 与流迭代器的组合用法。",
    code: "copy(begin, end, ostream_iterator<int>(cout, \" \"));",
    contentSrc: "assets/notes/legacy/stl-iterator-concepts.md"
  },
  {
    id: "legacy08",
    category: "C++",
    title: "STL：顺序容器",
    date: "2023-04-06",
    status: "旧稿归档",
    tags: ["C++", "STL", "容器"],
    summary: "对 vector、deque、list、array 等顺序容器的初始化、赋值、迭代器与常见操作进行横向整理。",
    code: "std::vector<int> values {1, 2, 3};",
    contentSrc: "assets/notes/legacy/stl-sequence-containers.md"
  },
  {
    id: "legacy09",
    category: "C++",
    title: "STL：关联容器",
    date: "2023-04-19",
    status: "旧稿归档",
    tags: ["C++", "STL", "map"],
    summary: "围绕 map 与 set 整理关联容器的定义、查找、插入和遍历，并以单词转换程序作为综合示例。",
    code: "std::map<std::string, std::string> transforms;",
    contentSrc: "assets/notes/legacy/stl-associative-containers.md"
  },
  {
    id: "legacy10",
    category: "C++",
    title: "STL：lambda 表达式",
    date: "2023-04-18",
    status: "旧稿归档",
    tags: ["C++", "STL", "lambda"],
    summary: "记录 lambda 的参数、捕获列表、返回类型和可变状态，并说明它与泛型算法的配合方式。",
    code: "auto add = [base](int value) { return base + value; };",
    contentSrc: "assets/notes/legacy/stl-lambda.md"
  },
  {
    id: "legacy11",
    category: "C++",
    title: "STL：泛型算法",
    date: "2023-04-13",
    status: "旧稿归档",
    tags: ["C++", "STL", "算法"],
    summary: "从只读、写入、重排到数值算法，整理泛型算法如何通过迭代器作用于不同容器。",
    code: "auto result = std::find(values.begin(), values.end(), target);",
    contentSrc: "assets/notes/legacy/stl-generic-algorithms.md"
  }
];
