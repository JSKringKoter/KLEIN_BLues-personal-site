---
title: 关联容器
tags:
  - c++
  - STL
abbrlink: 11731
date: 2023-04-19 18:50:36
---



不同于顺序容器使用顺序访问元素，关联容器使用关键字访问元素。map中的元素为key-value配对，set中的元素为单关键字。字典可以看作一个map容器——单词代表关键字，释义表示值。

STL提供8个关联容器，它们通过muti和unordered与map，set相互组合。multi表示允许重复关键字，unordered表示无序组织。



| 按关键字有序保存元素 | 作用                        |
| -------------------- | --------------------------- |
| map                  | 关联数组；保存 关键字-值 对 |
| set                  | 只保存关键字的容器          |
| multimap             | 关键字可重复出现的map       |
| multiset             | 关键字可重复出现的set       |

| 无序集合           | 作用                          |
| ------------------ | ----------------------------- |
| unordered_map      | 用哈希函数组织的map           |
| unordered_set      | 用哈希函数组织的set           |
| unordered_multimap | 哈希组织map，关键字可重复出现 |
| unordered_multiset | 哈希组织set，关键字可重复出现 |



### 使用关联容器

#### 使用map

一个经典的关联容器实例为单词计数器：

```c++
map<string, int> wordCount;
string word;
while (cin >> word) {
    ++wordCount[string];
}
for (auto& x : wordCount) {
    cout << x.first << " : " << x.second << endl;
}
```

输出大致是：

你说得对 : 2  啊对对对 : 3 …… （是否太过抽象了）

在for语句中使用auto自动类型推断，此时生成的是一个pair对象，该对象中定义了first和second公有成员，分别储存关键字及值。

<!--more-->

#### 使用set

set容器特别适合将某些元素忽略。将这些元素存放于一个set容器中，使用其find函数，若find返回超尾迭代器，则证明放入的元素不能忽略。

```c++
map<string, int> wordCount;
set<string> exclude = { "a", "b", "c" };
string word;
while (cin >> word) {
	if (exclude.find(word) == exclude.cend()) {  //如果find返回超尾迭代器，说明word不是需要忽略的元素
		++wordCount[word];
	}
}
```



### 关联容器概述

#### 定义关联容器

可以构造空容器或使用列表初始化来构造容器：

```c++
map<string, int> wordCount{ {"string", 1}, {"Kring", 2} };   //key-value放在一对中括号内，使用，隔开
set<int> iset = { 1, 2, 3};
set<int> iset2;   //创建一个空容器
```

#### 使用mutimap和mutiset

一个multimap和multiset中的元素不要求是唯一的（对于一个给定的关键字，只有一个值能够等于它。），这两者很适合用于处理单词释义不唯一的情况。

```c++
vector<int> ivec;
for (int i = 0; i < 10; i++) {   //创建一个1~9重复元素的vector
	ivec.push_back(i);
	ivec.push_back(i);
}

multiset<int> imset(ivec.begin(), ivec.end());  //使用来自vector的迭代器初始化multiset和set
set<int> iset(ivec.begin(), ivec.end());

cout << imset.size() << endl;                   //打印imset和iset的大小
cout << iset.size() << endl;                    //前者为20，后者为10
```



#### 有序关联容器关键字类型

有序关联容器关键字类型需要支持使用<排序，也可以提供自定义的排序函数用以排序。排序函数必须遵守**严格弱序**，可以理解为“小于等于”。在实际编程中，一个类型定义了行为正常的<运算符，则可以将其用作关键字类型。

可以在创建容器时使用关键字类型的比较函数，将比较函数的函数指针传递给容器用以构造类，**不同排序函数创建的容器类型不同**。

```c++
set<COBNumber, decltype(compare)*> cob(compare);
```

**使用decltype关键字来指出自定义操作的类型，使用其来获得函数指针类型时，需用*来指出使用一个函数类型的指针**



#### pair类型

pair类型定义在头文件utility中，它保存两个公有数据成员，可以通过.first和.second来访问它们。map容器的元素即为pair。以下是STL定义的pair操作：

```c++
pair<t1, t2> p;                  //创建pair的方法
pair<t1, t2> p(v1, v2);
pair<ti, t2> p = { v1, v2 };
make_pair(v1, v2);               //返回一个pair类型，类型通过v1， v2自动推断
p.first, p.second;
p1 relop p2;                     //relop为运算符
```

可以通过列表初始化的方法返回pair对象，假设一个需要返回pair的函数：

```c++
pair<string, int>
poss(vector<string>& v)
{
	if (!v.empty())
		return { v.back(), v.back().size() };   //返回一个由v最后一个元素和v最后一个元素的长度组成的pair
	else
		return pair<string, int>();             //返回一个空pair<string, int>
}
```



### 关联容器操作

关联容器保存了三个类型别名，表示容器关键字的值和类型。

* key_type  此容器类型的关键字类型
* mapped_type  每个关键字关联的值类型；只能适用于map
* value_type  对于set，即为key_type；对于map，为pair<const key_type, mapped_type>



#### 关联容器迭代器

对一个map容器的迭代器解引用将获得一个pair对象，其first即为关键字，second为值；对一个set容器解引用即得到其关键字。map的key_type值为const，set的value_type也为const，意味着解引用+赋值操作为非法。

```c++
//获取一个map容器的迭代器，且解引用
map<string, int> vi{ {"kaing", 2}, {"koter", 3} };
map<string, int>::iterator iter = vi.begin();
cout << (*iter).first << iter->second << endl;
//获取一个set容器的迭代器，且解引用
set<int> vs{ 1, 23, 3 };
auto iters = vs.begin();
cout << *iters << endl;
```



#### 遍历关联容器

map和set都支持begin和end，可以像对顺序容器那样对关联容器执行遍历操作。

```c++
auto iter = vc.begin();
while (iter != vc.end()) {
    cout << (*vc).first << " : " << vc->second << endl;
    iter++;
}
```



#### 添加元素

关联容器的insert成员函数向容器中添加一个元素或者一个范围，由于map和set不允许重复关键字，所以理论上随便加就行了，添加一个存在的元素对容器没有影响。insert有两个版本，一个版本接受一个迭代器，一个版本接受一个初始化列表。

```c++
set<int> set2;
set2.insert(5);                       //接受一个单值
set2.insert(vec.begin(), vec.end());  //接受一对迭代器
set2.insert({ 1, 2, 3 });             //接受一个初始化列表
```

对于map容器，需要注意map元素时pair，在使用insert时需要传递pair或能转化为pair的初始化列表：

```c++
map<string, int> sm;
sm.insert({ "string", 1 });
sm.insert(pair<string, int>(word, 1));  //显式构造pair
sm.insert(make_pair(word, 1));          //使用make_pair构造pair
```



##### 检测insert的返回值

insert和emplace返回一个pair对象，first成员返回指向插入成员的迭代器，second成员是一个bool变量，若为true，则插入成功（容器内没有重复元素）；若为法false，则插入失败。

可以使用这个设定来重写单词计数程序，虽然更加繁琐，但能很方便地观察返回值特性。

```c++
map<string, int> wordCount;
string word;
while (cin >> word && word != "q") {
	auto result = wordCount.insert({ word, 1 });    //auto生成一个pair< map<string, int>::iterator, bool >的类型
	if (!result.second)
		wordCount[word]++;
}
```

如果使用了旧版本的编辑器，需要这样写：

```pair<map<string, int>::iterator, bool> set = wordCount.insert({ word, 1 });```

向multimap和multiset中插入元素时，由于其允许重复关键字，返回的pair没有second元素，因为其必定插入成功。



#### 删除元素

可以向erase函数传递一个迭代器或一对迭代器范围来删除其中的元素。关联容器额外定义了一个erase函数，接受一个key_type类型，删除容器中等于此值的元素，返回删除的数量。对于map和set，数量只会为0或1，因为其不能接受重复元素；对于multi容器，数量可以不为0或1。

```c++
c.erase(p);
c.erase(a, b);
c.earse(word);   //传递一个关键字类型
```



#### map的下标操作

对map使用下标元素不同于数组或顺序容器，map“获取与关键字相关联的值”。如果关键字不存在，则下标操作将创建新的关键字。下标操作返回一个左值，意味着可以对其进行修改。无法对const map使用不存在的关键字，因为创建新关键字修改了容器。与容器不同，对map使用下标，返回的是mapped_type的值，而解引用迭代器返回的是value_type的值。

```c++
m[word];
m.at(word);    //与前者不同，若word不在容器中，则抛出一个out_of_range异常。
```



#### 访问元素

关联容器有以下几种查找元素的方法：

```c++
c.find(k);           //返回第一个关键字为k的迭代器
c.count(k);          //返回关键字为k的数量
c.lower_bound(k);    //返回第一个关键字不小于k的迭代器
c.upper_bound(k);    //返回第一个关键字大于k的迭代器
c.equal_range(k);    //返回一个pair，表示关键字k的范围；若k不存在，则两个成员都为c.end()
```



##### 在multi中查找元素

例如，JS_KringKoter写了五本书，这个B将它们的名字放在了一个multimap容器中，关键字就是这个B的名字。现在需要遍历容器，将他的书打印出来，使用上面的函数，共有三种方法。

###### find + count

find返回第一个关键字为k的迭代器，而count返回数量，利用这一点循环打印。

```c++
int main()
{
	multimap<string, string> kring{
		{"JS_KringKoter", "Dreamland Sky"},
		{"JS_KringKoter", "Yesterday Shadow"},
		{"JS_KringKoter", "Deep in Dust"},
	    {"AfternoonTea", "Final Mollody"} };

	string writerName = "JS_KringKoter";
	auto begin = kring.find(writerName);
	int bookCount = kring.count(writerName);

	for (int i = 0; i < bookCount; i++) {
		cout << writerName << " : " << begin->second << endl;
		begin++;
	}
}
```



###### lower_bound和upper_bound

lower_bound和upper_bound一对迭代器分别指向第一个具有指定关键字的元素，最后一个具有指定关键字元素的超尾。

```c++
int main()
{
	multimap<string, string> kring{
		{"JS_KringKoter", "Dreamland Sky"},
		{"JS_KringKoter", "Yesterday Shadow"},
		{"JS_KringKoter", "Deep in Dust"},
		{"AfternoonTea", "Final Mollody"} };
	string writerName = "JS_KringKoter";

	for (auto begin = kring.lower_bound(writerName),
		      end = kring.upper_bound(writerName);
		      begin != end; begin++) 
	{
		cout << writerName << " : " << begin->second << endl;
	}
//for可以用for_each
	for_each(kring.lower_bound(writerName), kring.upper_bound(writerName),
		[&](pair<string, string> pr) { cout << writerName << " : " << pr.second << endl; });
}
```



###### equel_range

equal_range函数接受一个关键字值，返回一个pair，其first和second分别为指向第一个和最后一个和接受的值相等的元素的迭代器。

```c++
int main()
{
	multimap<string, string> kring{
		{"JS_KringKoter", "Dreamland Sky"},
		{"JS_KringKoter", "Yesterday Shadow"},
		{"JS_KringKoter", "Deep in Dust"},
		{"AfternoonTea", "Final Mollody"} };

	string writerName = "JS_KringKoter";

	for (auto iter = kring.equal_range(writerName);
		iter.first != iter.second; iter.first++) {
		cout << iter.first->second << endl;
	}
}
```



### 例题：一个单词转换的map

从文件中读取转换映射：

```c++
map<string, string> buildMap(ifstream& map_file)
{
	map<string, string> trans_map;
	string key;
	string value;

	while (map_file >> key && getline(map_file, value)) {
		if (value.size() > 1)
			trans_map.insert({ key, value.substr(1) });
		else
			throw runtime_error("no rule for: " + key);
	}

	return trans_map;
}
```



转换：

```c++
const string& transform(const string& str, map<string, string> trans)
{
	auto iter = trans.find(str);
	if (iter != trans.end())
		return iter->second;
	else
		return str;
}
```

