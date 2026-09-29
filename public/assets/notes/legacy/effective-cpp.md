---
title: Effective C++
tags: c++
abbrlink: 60457
date: 2023-04-25 16:56:49
---

## 一、让自己习惯C++

### 条款01：视c++为一个语言联邦

如今的c++是一种多重泛型编程语言，同时支持面向过程，面向对象，函数形式，泛型形式，元编程形式的语言。可以这样理解C++：C++是一个由相关语言组成的语言联邦而并非单一语言。c++的主要次语言有四种：

* C部分：区块，语句，预处理器，内置数据类型，数组，指针等。
* Object-Oriented C++（面向对象）：类型，封装，继承，多态等。
* Template C++：泛型编程部分，提供了模板元编程。
* STL标准模板库：包含容器，迭代器，算法以及函数对象等

C++并不是一个带有一组守则的一体语言，而是四个次语言组成的联邦。



### 条款02：尽量以const，emum，inline替换 #define

“宁可以编译器替换预处理器。“

将```#define NUMBER 1.63```替换为

```
const double Number = 1.63;
```

当使用const替换时，有两种特殊情况：

* 定义常量指针时

常量表达式通常放在头文件内方便不同源码包含，有必要将指针（而不是指针所指之物声明为const）：

```c++
const char* const authorName = "Js_KringKoter";
//或使用更为合宜的string对象：
const string autherName = "JS_KringKoter";
```

* class专属常量时

为了将常量的作用域限制于class内，且防止其多次复制，有必要将其限定为static：

```c++
class Name {
private:
    static const int NameLenth = 10;
    ...
}
```

上述语句为NameLenth的声明而非定义，如果需要取该常量的地址，则需要在实现文件中对其定义：

```c++
const int Name::NameLenth;
```

亦可使用enum hack补偿做法：

```c++
class Name {
private:
    enum { NameLenth = 5 };
    int scores[NameLenth];
}
```

enum hack的行为与define较为相似，如取一个enum的地址为非法。

#### 使用inline函数代替#define

#define可能会导致问题，如：

```c++
#define CALL_WITH_MAX(a, b) f((a) > (b) ? (a) : (b))

int a = 5, b = 0;
CALL_WITH_MAX(++a, b)        //a被累加两次
```

使用template inline来代替：

```c++
template <typename T>
inline void CallWithMax(const T& a, const T& b)  //由于不知道T是什么，采用传递引用方式
{
    f(a > b ? a : b);
}
```



总结：

* 对于单纯常量，最好以const对象或enums替换#defines。
* 对于形似函数的宏，最好改用inline函数代替#defines。

<!--more-->

### 条款03：尽可能使用const

只要某值保持不变是一个事实，则应使用const，确保这条约束不被违反。可以通过const修饰指针和指针所指向的对象，使其不被修改：

```c++
int number = 10;
int* pn = number;               //非const指针，非const变量
const int* pn = number;         //非const指针，const变量
int* const pn = number;         //const指针，非const变量
const int* const pn = number;   //const指针，const变量
```

当const出现在*左边，则变量为const；出现在右边，则指针为const。另一种写法是：

```c++
int const * pn = number;        //有时会遇到，需要注意
```



#### const interator和const_interator

声明一个const interator和一个T* const一样，保证指向数据的指针为const；而const_iterator保证数据为const。

```c++
const vector<int>::iterator citer = vec.begin();   //相当于T* const
citer++;                                           //非法
*citer = 10;                                       //合法

vector<int>::const_iterator iterc = vec.begin();   //相当于const T*
iterc++;                                           //合法
*iterc = 10;                                       //非法
```



#### 令函数返回const

令函数返回一个const，可以降低因客户错误而造成的意外的同时，不至于放弃安全和高效性。考虑有理数（详见条款24）的operator*声明：

```c++
class Rational {...};
const Rational operator* (const Rational& lhs, const Rational& rhs);
//客户有时会因粗心而这样做：
Rational a, b, c;
(a * b) = c;
```

将返回值设置为const可避免客户如此操作。

#### 使用const成员函数

使用const成员函数有两个目的，一是指明了此class接口不会修改对象内容，二是使得函数可以操作const对象。一个事实是：两个成员函数只是常量性不同，可以被重载。也就是说，可以构造两个重载函数，一个用于操作const类型，一个操作non-const类型。

```c++
class Name {
private:
    int lenth[10];
public:
    //此函数中无法修改类的成员，无法对返回值赋值。
    const int& operator[](size_t locate) const
    { return lenth[locate]; }
    
    //此函数中可以修改成员，对返回值赋值会导致成员被修改。
    int& operator[](size_t locate)
    { return lenth[locate]; }

    //存在这样的函数，但会导致通过返回值修改const对象
    int& operator[](size_t locate) const
    { return lenth[locate]; }
}
```

函数前const限定了无法修改返回值，函数后const决定函数是对const还是non-const对象操作。对于const对象，我们并不希望其被修改，必须重载双const成员函数。

需要注意的是，一个non-const char operator[]返回一个char，诸如```name[] = 'x'```是不被允许的，即使允许，修改的也是一个副本，而原本的数据不会改变。



#### bitwise constness和logical constness

对于const该如何限定，有如上两派观点。BC派认为只有在不更改任何成员变量（static除外）时才能是const。这种观点可以很有效侦测违反点，但当出现指针指向了一个不属于类型的变量，如char* 字符串，const将失效：

```c++
class Name {
public:
	char& operator[](size_t locate) const
	{
		return name[locate];
	}
private:
	char* name;
};

const Name name;
name[0] = 'x';        //这条语句将通过编译，而且能够运行，最后结果是const对象的值被改变。
```



LC派认为const对象内可以包含不影响const性的非const对象，一个const成员函数可以修改它所处理的某些bits，但只有在客户端侦测不出时才能如此。使用mutable关键字修饰的变量可在const成员函数中修改。如：

```c++
class CTextBlock {
public:
	size_t length() const;

private:
	char* pText;
	mutable size_t textLength;
	mutable bool lengthIsValid;       //使用mutable关键字
};

size_t CTextBlock::length() const
{
	if (lengthIsValid == false) {
		textLength = strlen(pText);
		lengthIsValid = true;
	}
	return textLength;
}
```



#### 让non-const调用const成员函数来减少代码重复

很多情况下const成员函数和non-const成员函数代码基本相同，调用const对象，转化为non-const对象可以减少代码重复。

```c++
class Name {
private:
    char* name;
public:
    const char& operator[](size_t locate) const
    { return name[locate]; }
    
    char& operator[](size_t locate)
    {
        const_cast<char&> ( static_cast<const Name&> (*this)[locate] );
    }
}
```



总结：

* 将某些东西声明为const有助于编译器侦测出错误用法。
* 编辑器强制实施bitwise constness，但编写程序时应使用“概念上的常量性”。
* 当const和non-const成员函数有实质等价的实现时，令non-const版本调用const可避免代码重复。



## 二、构造，析构，赋值运算

### 条款04：确定对象使用前已被初始化

```c++
Name::Name(int a, string b, list<int> c)
{
    length = a;       //是初始化
    str = b;          //不是初始化，而是赋值
    listInt = b;      //不是初始化，而是赋值
}
```

对于类构造函数，应尽可能使用初始化列表。初始化列表和赋值操作结果相同，但效率更高，原因是在创建成员类的时候无需调用赋值构造函数。应将上述代码改为：

```c++
Name::Name(int a, string b, list<int> c)
    :length(a),
     str(b),
     listInt(c)
{ }                 //构造函数无需任何操作
```

如果需要一个无参的default构造函数，则仅需指定无物作为初始化列表即可。



#### 将简单初始化移向函数

对于有多个构造函数的类型，如果一部分内置类型重复，可以考虑将其移到单独的函数中，可以使用赋值初始化（伪初始化）。但通过列表初始化更为可取。

#### 一致声明顺序和初始化顺序

别问，问就是防止晦涩错误，比如A需要B的值，但B在A后初始化。



#### 不同编译单元内的non-local static对象的初始化

non-local static对象：在本函数内的static对象被称作local static对象，而其他不是函数内的static对象称作non-local static对象。

编译单元：可以理解为不同的两个文件，如两个头文件，各包含了一个static对象，这两个static对象和两个文件之间就是non-local static关系。

由于non-local static对象的初始化顺序并没有一定的规定，所以当一个编译单元的元素需要一个non-local static对象时，有可能该对象还没有被编译。看以下实例：

```c++
class FileSystem {
    ...
}
extern FileSystem tfs;           //预留给客户的对象

//客户在别处使用
void printFile(const string& str)
{
    cout << str << tfs;          //此时tfs不一定完成了初始化
}
```

当使用tfs的时候该对象不一定完成了初始化。这将导致灾难。解决办法是写一个函数，在函数内构建一个local static对象替换non-local static对象，返回一个指向该对象的引用。

```c++
inline FileSystem& tfs()
{
    static FileSystem tfs;
    return tfs;
}

//客户使用
void printFile(const string& str)
{
    cout << str << tfs();        //调用tfs()，获得一个指向non-local tfs的引用
}
```

该函数简单的reference-returning使得它很适合成为inline函数。对于多线程编程，有可能带有不确定性，需要在单线程启动阶段手动调用所有reference-returning函数。



总结：

* 对内置对象进行手工初始化，因为C++不保证初始化它们。
* 构造函数最好使用初始化列表，不要在构造函数本体中使用赋值操作。初始化列表的成员顺序需要与声明列表一致。
* 为了防止跨编译单元的初始化顺序问题，需要使用local static替换non-local static。



### 条款05：了解C++默默编写并调用哪些函数

对于一个没有提供函数的类，编译器自动为其编写 构造函数，析构函数，复制构造函数以及operator=()运算符函数。如果用户创建了一个含参数的构造函数，编译器将不再自动编写default构造函数。

对于复制构造函数，c++将一一拷贝类型内每个bits来完成初始化（注意复制构造函数仅在创建类时调用，赋值操作使用=运算符），一般不会出现问题，而重载的=运算符在遇到引用和指针时会出现问题，此时编译器拒绝生成对应的operator=()运算符函数。

```c++
class Name {
private:
	int nameLength;
	std::string& name;                       //成员为引用
public:
	Name(const int& namel, string& na) :
		nameLength(namel),
		name(na)
	{}
};

int main()
{
    string na1("kringkoter");
    string na2("rainimator");
    Name name1(2, na1);
    Name name2(3, na2);
    
    name1 = name2;             //不被允许，c++拒绝生成operator=()函数。
}
//错误信息：无法引用 函数 "Name::operator=(const Name &)" (已隐式声明) -- 它是已删除的函数
```

如果需要使用一个内含引用或者const对象的类型，必须自己编写operator=函数，编译器不会做这件事。



总结：

* 编译器可以暗自为class创建default构造函数，copy构造函数，copy assignment操作符函数，以及析构函数。



### 条款06：如果不想使用编译器提供的函数，就应当明确拒绝。

编译器可以自动创建复制和=运算符函数，有时并不希望使用这两个函数，但编译器会自动提供，此时需要明确拒绝。

#### 将函数原型置于private

```c++
class Name {
private:
    int a;
    Name(const Name&);
    Name& operator=(const Name&);
}
```

将函数原型置于private使得其无法被除成员函数访问，且编译器不再自动提供。



#### 继承Base类，将函数原型置于Base

```c++
class Base {
protected:
    Base() = default;
    ~Base() = default;
private:
    Base(const Base&);
    Base& operator=(const Base&);
}

class Name : public Base {
private:
    int length;
public:
    Name() = default;
    ~Name() = default;
}

int main()
{
    Name name1(6);
    Name name2(4);
    name1 = name2;      //非法，错误信息：
                        //无法引用 函数 "Name::operator=(const Name &)" (已隐式声明) -- 它是已删除的函数

}
```



总结：

* 为驳回编译器自动提供的机能，可将相应的成员函数声明为private并不予实现。也可以使用base class办法。



### 条款07：为多态基类声明virtual析构函数

如果基类析构函数不是virtual，在析构指向派生类对象的基类指针时，仅仅调用基类析构函数，导致派生类成员无法正确析构，可能会导致内存泄漏。

如果基类含有virtual函数，几乎确定应该有一个virtual析构函数。如果基类不含有virtual函数，表示它并不意图做一个base class，一般不用声明virtual析构函数。

当需要一个抽象基类而又没有适合的纯虚函数时，可以将析构函数声明为纯虚，同时也解决了析构函数为虚的问题。

```c++
class Base {
    public:
    virtual ~Base() = 0;
}
```

总结：

* 带有多态性质的base class应该声明一个virtual析构函数。如果class带有任何virtual函数，应当拥有一个virtual析构函数。
* 如果类型不是为了多态而设计，或者不是base class，就不该声明virtual析构函数。



### 条款08：*不要让异常逃离析构函数



### 条款09：绝不在构造和析构过程中调用virtual函数

有下列程序段：

```c++
class Name {
public:
	virtual void con() = 0;
	Name()
	{ con(); }
};

class Len : public Name {
public:
	virtual void con();
	Len()
	{}
};
```

在生成Len对象时，首先调用base class构造函数，此时调用的virtual还“不是”virtual函数，它并没有使用派生类中的实现。

由于无法在构造函数中使用virtual函数，可以改用向base class传递必要的构造参量来代替。



### 条款10：令operator=返回一个reference to *this

基本类型可以使用诸如```x = y = z;```的连续赋值，自定义类型也最好如此。想要实现这一功能，需要返回一个指向左值的引用。

```c++
Name& operator=(const Name& rhs)
{
    ...
    return* this;
}
```

对于其他赋值运算符，如+=，-=，*=等，也同样适用。

```c++
Name& operator+=(const Name& rhs)
{
    ...
    return* this;
}
```



### 条款11：在operator= 中处理自我赋值

#### 证同测试法

在实现最前面加上证同测试是传统做法，它能够处理自我赋值，但无法处理异常安全性。同时增加的判断语句减慢了代码运行速度。

```c++
Name& operator=(const Name& rhs)
{
    if (this = &rhs) return *this;        //证同测试
    delete[] pd;
    pd = new char(*rhs.pd);
    return *this;
}
```

#### 临时变量法

```c++
Name& operator(const Name& rhs)
{
    char* newChar = pd;         //获得一个pd的临时变量
    pd = new char(*rhs.pd);     //将pd指向新的内存空间，且值等于rhs.pd 
    delete[] newChar;           //删除临时变量
    return *this;
}
```

#### swap and copy法

使用一个swap函数交换*this和rhs的数据。

```c++
void swap(const Name& rhs);
Name& operator(const Name& rhs)
{
    Name newName(rhs);
    swap(newName);
    return *this;
}
```



总结：

* 确保当对象自我赋值时operator=有良好的行为。其中技术包括比较“来源对象”和“目标对象”的地址、精心周到的语句顺序，copy-and-swap。
* 确定任何函数如果操作一个以上的对象，而其中多个对象是同一个对象时，其行为仍然正确。



### 条款12：复制对象时勿忘其每一个成分

每一个类中都会有copying构造函数和operator=函数，如果不显式声明，编译器会提供默认的函数。如果选择使用自己的函数，当有对象没有复制时，编辑器不会发出警告。

```c++
class Name {
private:
	int len1;
	int len2;
public:
	Name(int l1, int l2) 
		: len1(l1),
		  len2(l2)
	{}
	~Name() = default;

	Name(const Name& rhs)
		: len1(rhs.len1),
		  len2(rhs.len2)
	{}

	Name& operator=(const Name& rhs)
	{
		len1 = rhs.len1;
		len2 = rhs.len2;
		return *this;
	}
};
```

需要注意将每一个对象都包括在内。

在遇到继承时，要注意复制基类对象。由于继承类无法直接访问基类私有成员，需要调用基类复制构造函数和operator=函数。

```c++
class N : public Name {
private:
	int len3;
public:
	N(int l1, int l2, int l3)
		: Name(l1, l2),
		  len3(l3)
	{}
	~N() = default;

	N(const N& rhs)
		: Name(rhs),            //调用基类copying函数
		  len3(rhs.len3)
	{}

	N& operator=(const N& rhs)
	{
		Name::operator=(rhs);   //调用基类copy assignment函数
		len3 = rhs.len3;
		return *this;
	}
};
```



总结

* copying函数应该确保复制“对象内的所有成员变量”及“所有base class成分”。
* 不要尝试以某个copying函数实现另一个copying函数。应该将共同的代码放入一个init函数，并由两个copying函数共同调用。



## 三、资源管理

### 条款13：以对象管理资源

很多类拥有这样一个函数，它请求内存资源，返回一块内存空间，这样的函数成为factory函数（工厂函数）。

```c++
CoffeeBar* creatCOB();   //返回指针，指向COB继承体系内的动态分配对象。
```

由于在函数内使用了new，使用者需要在使用函数后使用delete：

```c++
void function()
{
    CoffeeBar* newCOB = creatCOB();
    ...
    delete CoffeeBar;
}
```

但在有的时候，delete有可能会被忽略，比如if，跳出了while，引发了异常等。这时内存得不到释放，即会发生内存泄漏。为确保资源归还给系统，可以把资源的控制权交给资源控制类来实现。可以使用unique_ptr和shared_ptr来管理内存。

```c++
void function()
{
    shared_ptr<CoffeeBar> newCOB = creatCOB();
    ...    
}    //在函数结束前，newCOB的析构函数将删除内存。
```

对于资源管理，有以下两个注意点：

* 获得资源后立刻将资源放入对象，使用资源管理对象来管理资源通常要比手动更加安全。资源取得时机便是初始化时机。
* 管理对象运用析构函数确保资源被释放。

> share_ptr和unique_ptr包含在memory头文件内。
>
> share_ptr被称作引用计数型智慧指针（RCSP），它持续追踪有多少对象指向资源，并在没有指向时删除它。



### 条款14：*在资源管理中小心copying行为



### 条款15：在资源管理类中提供对原始资源的访问

由于不是所有API都需要资源管理对象，直接访问原始资源显得很重要。比如下面的例子，它需要一个原始指针，但传递了一个智能指针，这是不被允许的。

```c++
void function(int* ptr);

shared_ptr<int> pi(new int);
function(pi);                   //错误！
```

需要将智能指针显示转换为普通指针对象，才能通过编译。智能指针对象提供一个get()成员函数，返回一个普通指针指向管理的内存。

```c++
function(pi.get());
```

有时需要在自己的资源管理类中提供显式和隐式转换函数，用来适配原始资源的API：

```c++
class ptr {                                         //这个类处理的是Cob类
public:
    Cob get() const { return cob; }                 //显式转换函数
}

class ptr {
public:
    operator Cob() const { return cob; }            //隐式转换函数
}
```

这两者都存在问题，前者使得每次转换都需要条用get()函数（其实也没有那么烦），而隐式转换容易出现意外转换的问题：

```c++
ptr newPtr1(new Cob);
Cob newPtr2 = newPtr1;          //本意是创建一个ptr对象。
                                //如果不声明隐式转换函数，则不会通过编译，减少了错误可能性。
```



总结：

* API通常要求访问原始资源，每一个RAII class应该提供一个取得管理的原始资源的方法。
* 对原始资源的访问可能经由显式和隐式转换，一般而言显示转换更加安全，但隐式转换对于客户来说更加方便。



### 条款16：成对使用new和delete时要采用相同形式

如果在new表达式中使用[]，必须在相应的delete表达式中也使用[]。尽量避免对数组使用typedef：

```c++
typedef string AddressLines[4];
string* pal = new AddressLines;        //这是个4元素的数组

delete pal;
delete[] pal;
```



### 条款17：以独立语句将new对象置入智能指针内

假设有个函数需要传递一个shared_ptr，该函数原型和调用如下：

```c++
void function(std::shared_ptr<int>, int fun);

function(std::shared_ptr<int>(new int), fun());                         //fun是一个返回int的函数
```

这样的调用可能会产生资源泄漏问题。在调用这样的函数时，需要进行三部操作：1.调用new int，2.调用shared_ptr<int>构造函数，3.调用fun()函数。

c++并没有规定这三者的调用顺序（除了第一步肯定在第二步之前，但第一步和第三步的顺序未定），可能出现调用fun后才调用shared_ptr构造函数，如果在fun中抛出了异常，new int请求的资源就无法进入智能指针中，无法正确析构。

避免这样的情况只需要使用一条单独的语句构造智能指针对象：

```c++
std::shared_ptr<int> pi(new int);
function(pi, fun());
```

这样即使抛出异常，请求的资源也能正确回到系统中。



总结：

* 以独立语句将newed对象储存于智能指针中，如果不这样做，一旦抛出异常，有可能导致资源泄漏。



## 四、设计与声明

### 条款18：让接口容易被正确使用，不易被误用

对于一个记录日期的类，它需要三个参数：年，月，日。对于不同的地区，这三个量的排列顺序有可能不同。对于下面的类：

```c++
class Date {
public:
    Date(int valYear, int valMonth, int valDay)
        : year(valYear),
          month(valMonth),
          day(valDay)
    {}
private:
    int year;
    int month;
    int day;
}
```

构造函数的正确调用应该是：

```c++
Date date(2004, 5, 28);
```

但由于某种地区原因，有人可能会这样写：

```c++
Date date(28, 5, 2004);          //错误调用
```

避免这样的情况发生，可以指定每一个元素一个数据类型（比如一个结构），取消隐式类型转换，这样使得接口更加清晰明了：

```c++
struct Day {
	explicit Day(int day) 
        : val(day) 
    {}
	int val;
};
struct Month {
    Month(int month) 
        : val(month)
    {}
    int val;
}
struct Year {
	explicit Year(int year)
        : val(year)
    {}
	int val;
};

class Date {
private:
	Month month;
	Day day;
	Year year;
public:
	Date(const Year& valYear, const Month& valMonth, cosnt Day& valDay)
        : year(valYear),
          month(valMonth),
          day(valDay)
    {}

};
```

但是仍然有问题存在，比如客户传递了错误的月份。可以使用枚举量来代表某个月份，但那样很容易使得枚举量被用作int。所以使用静态成员函数，构造12个月份函数：

```c++
class Month {
public:
	static Month Jan() { return Month(1); };
	static Month Feb() { return Month(2); };
private:
	explicit Month(int month) : val(month) {}
	int val;
};
```

这样调用就会变成：

```c++
Date date(Year(2004), Month::Jan(), Day(28));
```



总结：

* 好的接口很容易被正常使用，不容易被误用，应该在所有接口中努力达成这些性质
* “促进正确使用”的办法包括接口的一致性，以及与内置类型的行为兼容。
* “阻止误用”的办法包括建立新类型，限制类型上的操作，束缚对象值，以及消除客户的资源管理责任。



### 条款19：*设计class犹如设计type

-看书看书看书看书-



### 条款20：宁以传递const引用替换传值

pass-by-value很多时候是费事且消耗资源的，在传递用户自定类型时需要传递引用以提高速度：

```c++
void function(CoffeeBar cob);          //传递用户自定义类型有时很消耗资源
void function(const CoffeeBar& cob);   //修改之后
```

使用const使得程序不会在运行中修改数据。

对于内置类型和STL迭代器来说，传递引用有时并不优于传值，对于上述两者考虑使用pass-by-value。

#### 使用pass-by-reference-to-const防止对象切割

> 对象切割：在继承体系中，将子类按值转换为基类时，子类成员丢失，且不具备子类特性（如使用子类virtual函数）。

```c++
class CoffeeBar {
public:
    virtual string name() const;
}
class COB : public CoffeeBar {
public:
    virtual string name() const;
}

void function(CoffeeBar c)
{
    c.name();
}
```

在这个pass-by-value函数调用中，c.name()将解析为CoffeeBar::name()，而不是COB::name()。原因是按值传递时，c被初始化为基类对象，发生了对象切割。

```c++
void function(const CoffeeBar& c)
{
    c.name();                       //这样就不会了
}
```

修改如上，现在它能够正确反映多态。c.name()将解析为COB::name()。



总结：

* 尽量以pass-by-reference-to-const替换pass-by-value。前者通常比较高效，并且可避免对象切割问题。
* 以上规则并不适用于内置类型，以及STL的迭代器和函数对象。对它们而言，pass-by-value往往比较适当。



### 条款21：必须返回对象时，别妄想返回其reference

考虑一个有理数类，其中有一个operator*函数：

```c++
class Rational {
public:
	Rational(int num) : val(num) {}
	~Rational() = default;

	const Rational operator*(const Rational& rhs)
	{
		return Rational(rhs.val * val);
	}
private:
	int val;
};
```

其operator*函数返回一个对象（而非引用）。这样需要付出额外的构造及析构成本，如果返回reference，则不需付出代价，但是会出现其他很多问题。

```c++
Rational ra1(5);
Rational ra2(6);
Rational ra3 = ra1 * ra2;   //ra1和ra2返回的引用存在吗？
```

ra1 * ra2的值为30，但有没有值为30的对象呢，又有没有指向这个对象的引用呢？很明显没有。如果operator*要返回一个reference指向此值，必须自己创建对象。

但自己创建对象需要额外的构造及析构成本，这是pass-by-reference的初衷，但这样写已经违反了初衷，还会引发新的问题：

```c++
const Rational& operator*(const Rational& rhs)
{
    Rational result(rhs.val * val);
    return result;
}
```

在函数运行结束后，result对象被析构，此引用指向了一个并不存在的对象，这将导致无定义行为。

如果我们将本在栈区的对象放在堆区呢？这样反而会导致更多问题：

```c++
const Rational& operator*(const Rational& rhs)
{
    Rational* result = new Rational(rhs.val * val);
    return *result;
}
```

确实返回了一个可用的引用，但问题是，应该在何处delete请求的资源呢？将这个工作抛给客户是不合理的。



### 条款22：将成员变量声明为private：

如果将成员变量声明为public或protected，意味着当某个变量发生改变（改名，或者是删除）时，客户码将会大幅度变化。另外，需要考虑封装性，当某个方法的实现改变时，客户不应当知道，也不应当需要修改客户码。

某物的封装性和“当改变其内容时造成的代码破坏量”成反比。protected和public一样，没有封装性。

记住：

* 切记将成员变量声明为private。这可赋予客户访问数据的一致性、可细微划分访问控制、允诺约束调节获得保证，并提供class作者充分的弹性。
* protected并不比public更具封装性。



### 条款23：宁以non-member, non-friend函数代替member函数

对于一个CoffeeBar类，其拥有三个成员变量，三个重置成员变量的函数。此时需要一个重置所有变量的函数，该函数有成员函数版本和非成员函数版本。

```c++
class CoffeeBar {
private:
	int val1, val2, val3;
public: 
	CoffeeBar(int v1, int v2, int v3)
		: val1(v1),
		  val2(v2),
		  val3(v3)
	{}

	CoffeeBar() = default;

	void resetV1() { val1 = 0; }
	void resetV2() { val2 = 0; }
	void resetV3() { val3 = 0; }

	void resetAll()                      //成员函数版本
	{
		resetV1();
		resetV2();
		resetV3();
	}
};

void resetCob(CoffeeBar& cob)            //非成员函数版本
{
	cob.resetV1();
	cob.resetV2();
	cob.resetV3();
}
```

面向对象守则要求，数据尽可能被封装。而封装性的判断标准从简单来说是：越多函数（member函数和friend函数）可以访问成员变量，封装性越差。

c++倾向于使用非成员函数，且非成员函数可以放在一个ntility工具类中，成为一个static函数。只要它不是CoffeeBar的一部分，他就不会影响封装性。比较自然的做法是让resetAll成为一个non-member函数并位于和Coffeebar相同的namespace内。

namespace可以跨越文件，而class不能。namespace内的对象可以不放在同一个文件中，只需要指名它属于同一个namesapce就可以了。

c++STL就是如此组织的，比如string，vector类，只需要包含特定的头文件，但它们都在namespaec std中。

```c++
namespace cob {
    
class CoffeeBar {
private:
	int val1, val2, val3;
public: 
	CoffeeBar(int v1, int v2, int v3)
		: val1(v1),
		  val2(v2),
		  val3(v3)
	{}

	CoffeeBar() = default;

	void resetV1() { val1 = 0; }
	void resetV2() { val2 = 0; }
	void resetV3() { val3 = 0; }
};
    
}

namespace cob {

	void resetCob(CoffeeBar& cob)            //非成员函数版本
	{
		cob.resetV1();
		cob.resetV2();
		cob.resetV3();
	}
}
```



总结：

* 宁可拿non-member non-friend函数替换member函数。这样做可以增加封装性，包裹弹性和机能扩充性。



### 条款24：若所有参数皆需类型转换，请为此采用non-member函数

对于一个有理数类型：

```c++
class Rational {
public:
	Rational(int num)
		: val(num)
	{}
	~Rational() = default;

	const int getVal() const
	{
		return val;
	}
private:
	int val;
};

```

由于它是有理数类型，我们希望它能够和基本类型进行更加“明显的”乘法运算，比如ran * 4，首先4通过隐式类型转换，自动调用了构造函数转换为了Rational对象，再通过一个operator*函数返回一个Rational对象。如果乘法运算符函数是个成员函数：

```c++
const Rational operator*(const Rational& rhs)
{
    return Rational(val, rhs.val);
}

Rational ran(4);
cout << ran * 4;       //正确
cout << 4 * ran        //错误！
```

第二条语句不能通过编译，原因如同下面的代码：

```c++
ran.operator*(4);      //正确
4.operator*(ran);      //错误！
```

4没有对应的class，所以编译器试图寻找成员函数operator*失败，于是它在global寻找非成员函数版的operator函数，但没有找到。

4不在operator*()的参数列中（即函数调用不是operator(4）），无法进行隐式类型转换。此时需要一个非成员函数版本的运算符函数：

```c++
class Rational {
public:
	Rational(int num)
		: val(num)
	{}
	~Rational() = default;
    
	int getVal() const          //由于运算符函数传递const参数，后面的const是必须的
	{
		return val;
	}
private:
	int val;
};

const Rational operator*(const Rational& lhs, const Rational& rhs)
{
	return Rational(lhs.getVal() * rhs.getVal());
}
```

如果自定义的类型不必将所有类型转换为自定义类型，诸如此类的函数可以是member函数。



总结：

* 如果你需要为某个函数的所有参数（包括被this指针所指的那个隐喻参数）进行类型转换，那么这个函数必须是non-member。



### 条款25：*考虑写出一个不抛出异常的swap函数



## 五、实现

### 条款26：尽可能延后变量定义式的出现时间

当定义了一个带有构造函数和析构函数的对象时，如果这个对象实际并未使用，仍需承受构造和析构成本。第二是当出现异常时，未使用的资源可能会浪费。

处理方法则是，只有当下一步就要用到这个对象，且可以对其进行初始化时，才能创建该对象。

```c++
std::string name("KringKoter");
int lenth = 10;
```

对于循环来说，在循环外声明的变量可以延续至循环后，且不必重复构造；但其可能重复调用复制函数。用哪个方法视具体情况而定。



总结：

* 尽可能延后变量定义式的出现。这样做可以增加程序的清晰度并改善程序效率。



### 条款27：尽量少做转型动作

c++提供了四种“新式转型”，应在程序中代替旧式转型以增强程序可读性：

* const_cast<>通常用来将对象的常量性移除，它是唯一有此权力的c++ style转型操作符。
* dynamic_cast<>用来执行“安全向下转型，它的运行成本耗费重大。
* reinterpret_cast<>执行低级转型，如将一个int指针转化为int。
* static_cast<>执行强制类型转换，可以将non-const对象转化为const，但无法反向将const转化为non-const。



#### 转型获得的是副本

就static_cast而言，其转换操作只是获得了其一个副本，其本身数据并没有改变。在继承体系中，尝试调用基类方法不能这样写：

```c++
static_cast<base>(*this).function();
```

它其实调用了一个base副本的函数，并没有修改原始对象。应该这样写：

```c++
base::function();
```



#### 少用dynamic_cast，而改为直接使用派生类指针。

dynamic_cast转型需要耗费大量资源和时间，尝试替换下列代码：

```c++
shared_ptr<Base> newDerive;
dynamic_cast<Derived*> derive(newDerive->get());

//替换为
shared_ptr<Derived> newDerive;
Derived* derive(newDerive->get());
```



总结：

* 如果可以，尽量避免转型，特别是注重效率的代码中避免dynamic_cast。如果有个设计需要转型动作，设计无需转型的代替设计。
* 如果转型是必要的，将其放入函数。客户可以调用该函数。
* 宁可使用c++ style转型，不要使用旧式转型。前者很容易辨识。



### 条款28：避免返回handles指向对象的内部成分

考虑下面的对象，其使用一个结构来保存val，并在对象内使用指针指向结构来节省内存。考虑其成员函数：

```c++
struct v{
	int val;
};

class Name {
private:
	shared_ptr<v> pv;
public:
	int& getVal() const { return pv->val; }
}; 

Name name(8);
int& n = name.getVal();
n = 100;                  //修改了成员数据
```

由于返回了一个引用（套指针，如果此例没使用指针的话会编译出错，此条例有限制条件），在外部可以修改内部数据。而且当对象析构时，内部对象不复存在，而外部引用仍然指向内部对象，这会导致引用或指针挂起。

总结：

* 避免返回引用，指针，迭代器指向对象内部。这样可以增加封装性，帮助const对象的行为像个const，并减少发生虚吊引用或指针的情况。



### 条款29：*“为异常安全”而努力是值得的



### 条款30：透彻了解inline的里里外外

#### inline的组织方式

编译器处理inline函数的方式是，对于inline函数的每个调用，都使用相应的代码来代替它。当函数inline的代码很少时，编译器产出的代码可能比直接调用函数更少。如果如此，将增加程序的处理速度。但是，使用代码来替换调用使得inline函数没有地址，对其的函数指针将创建一个outline函数对象。



#### 请求inline函数

inline关键字只是一个对编译器的申请，编译器有权利不理会。有时候inline函数并不需要明确指出，只需将函数定义于class内。这样的函数通常是成员函数，定义于class内的friend函数也是inline：

```c++
class Name {
    int val;
public:
    int getVal() { return val; }       //隐式的inline函数
}
```

明确声明为inline需要使用inline关键字，inline函数通常声明于头文件之内，因为编译器需要知道其如何实现。function template通常也声明于头文件内，很多程序员认为template函数一定要声明为inline。但这是个错误的想法，只有当确定其所有版本的函数都需要inline，才能将其声明为inline。



#### 编译器可能拒绝inline

有的时候编译器确实有意向生成一个inline，但还是为其提供一个outline函数对象。编译器通常不对virtual函数实行inline，因为需要等待运行期才能知道调用哪个函数。

空的构造函数看上去很适合成为inline函数：

```c++
class Name : public Coffeebar{
private:
    std::string str;
public:
    Name() {}
}
```

但空的构造函数实际上并不是空的。编译器在其中添加了Base class的构造函数，初始化str和其他变量的方法，异常处理……如果上述函数也是inline，构造函数的代码量将极其庞大。

同时，将函数声明为inling会使得程序的更新变得复杂。在改变inline函数后，客户端需要重新编译。

掌握一个合乎逻辑的规则：一开始先不声明任何函数为inline，在合理的情况下声明为inline，并竭力减少其代码量。



### 条款31：将文件之间的编译关系降到最低

一个类的定义式不止详细叙述了其接口，还包括了十足的实现细目。当我们改变实现（甚至仅仅是一个变量的名字）时，所有有关文件都需要重新编译连接。但如果提供声明式，客户看到的只是接口，而无关实现。当实现改变时，和接口没有关系，客户便无需修改。

```c++
//定义式，包含了所有实现细目。
#include "cob.h"
class Name {
private:
    int val;
public:
    Name() {...}
}

//声明式，仅包含接口。
class cob;
class Name {
public:
    Name();
}
```

当一个类型的实现十分庞大时，当其实现代码改变时，我们需要重新编译连接。我们并不希望这样的情况发生。



#### handle class法

handle class将类型拆分为二，一个仅包含接口，通过一个指针指向另一个；另一个包含完整实现。这样，当实现改变时，客户无需重新编译连接，因为接口没有发生改变。

Implementation.h

```c++
class CoffeeBarImpl {
private:
	std::string name;
	int age;
public:
	CoffeeBarImpl(const std::string& name_, int age_)
		: name(name_), age(age_)
	{}

	~CoffeeBarImpl() = default;

	int getAge() const { return age; }
	void setAge(int val) { age = val; }
	std::string getName() const { return name; }
	void setName(const std::string& val) { name = val; }
};
```

CoffeeBar.h

```c++
#include "implementation.h"
class CoffeeBar {
private:
	std::shared_ptr<CoffeeBarImpl> pImpl;       //指向imlp的指针
public:
	CoffeeBar(const std::string& name_, int age_)
		: pImpl(new CoffeeBarImpl(name_, age_))
	{}

	~CoffeeBar() = default;

	int getAge() const;
	void setAge(int val);
	std::string getName() const;
	void setName(const std::string& val);
};
```

Coffeebar.cpp

```c++
#include "Coffeebar.h"
#include "implementation.h"
int CoffeeBar::getAge() const
{
	return pImpl->getAge();
}

void CoffeeBar::setAge(int val)
{
	pImpl->setAge(val);
}

std::string CoffeeBar::getName() const
{
	return pImpl->getName();
}

void CoffeeBar::setName(const std::string& val)
{
	pImpl->setName(val);
}
```

Implementation提供了实现细目，而Coffeebar只是调用其中的方法。将定义式和声明式置于两个不同的头文件中，客户在使用时只需要包含声明式头文件即可。



#### Interface class法

interface class法声明一个抽象基类，使用该抽象基类派生一个类。基类和派生类拥有一样的接口，但具体实现在派生类中。基类中包含一个factory函数，生产一个指向派生类的基类指针供使用。在使用时，调用factory函数获得一个指向派生类的基类指针，使用基类virtual接口，调用实际是派生类方法。

Base.h

```c++
class COBBase {
public:

	static std::shared_ptr<COBBase> creatCOB(const std::string name_, int age_)
    {
	    return std::shared_ptr<COBBase>(new Coffeebar(name_, age_));
    }
	//返回基类指针，指向派生类对象，可使用派生类virtual函数
	virtual ~COBBase() = 0;

	virtual std::string getName() const = 0;
	virtual void setName(const std::string& val) = 0;
	virtual int getAge() const = 0;
	virtual void setAge(int val) = 0;
};
```

Coffeebar.h

```c++
class Coffeebar : public COBBase {
private:
	std::string name;
	int age;
public:
	Coffeebar(const std::string name_, int age_)
		: name(name_),
		  age(age_)
	{}

	virtual ~Coffeebar()
	{}

	virtual std::string getName() const;
	virtual void setName(const std::string& val);
	virtual int getAge() const;
	virtual void setAge(int val);
};
```

成员函数实现文件和上一个方法基本一致。



总结：

* 支持“编译依存性最小化”的一般构想是：相依于声明式，不要相依于定义式。基于此构想的两个手段是handle class和interface class（将接口和实现分离）。



## 六、继承与面向对象

### 条款32：确定在你的public继承塑膜出is-a关系

class之间的关系有三种：is-a，has-a，is-implemented-in-terms-of（根据某物实现出）。public继承要求严格is-a关系，也就是适用于base的每一件事情都适用于derived class。每一个derived class对象都是一个base class对象。



### 条款33：避免遮掩继承而来的名称

在继承体系中，如果派生类尝试重载基类接口，基类接口将直接被掩盖，而并非被重载。

```c++
class Base {
private:
	int val;
public:
	virtual void set1() { val = 5; }
	void set2() { val = 2; }
};

class Derived : public Base {
public:
    //即使接口只改变了参数列表，仍然不是重载，而是覆盖
	virtual void set1(int s) { getVal() = 1; }
	void set2(int n) { getVal() = 4; }
};
```

解决方法：使用using指令，使得基类函数作用域扩大：

```c++
class Derived : public Base {
public:
    //使用using
    //现在set1有两个重载版本：set1(), set1(int)
	using Base::set1;
	virtual void set1(int s) { getVal() = 1; }
	void set2(int n) { getVal() = 4; }
};
```



#### 补充：函数与作用域

假设一个derived class的方法像这样：

``` c++
class Derived : public Base {
    ...
    void baseFun() {
        fun();
    }
    ...
}
```

当编译器看到这里的fun时，它会现在local作用域（也就是baseFun中查找），但一无所获。之后它将查找其外围作用域，即Dervied class中，仍然一无所获。在之后它查找Derived class外，也就是Base class中，如果找到，则停止查找。如果再没有找到，它将检索#include的头文件中是否存在。如果还是没有，则发生编译时错误。



总结：

* derived class内的名称会遮掩base class内的名称。在public继承下从来没有人希望如此。
* 为了让被遮掩的函数重见天日，成为一个重载版本，可使用using声明式。



### 条款34：区分接口继承和实现继承

在对基类方法的继承中，我们可能需要

* 仅继承接口，并要求派生类提供实现
* 继承接口和实现，但希望派生类覆写实现
* 继承接口和实现，且不允许覆写实现

对应的方法类型为pure virtual函数，simple pure virtual函数和non virtual函数。



#### 仅继承接口，要求派生类提供实现

一个抽象基类：

```c++
class VirtualBase {
public:
    virtual void draw(int locate) = 0;
}
```

它的派生类只继承了它的接口，即函数定义，但没有实现。派生类需要自己提供实现。

* 声明一个pure virtual函数的目的是让derived class只继承接口。

然而，可以给纯虚函数提供一份实现代码，由于抽象类无法创建具体对象，只有通过VirtualBase::draw()来访问：

```c++
void Virtual::draw(int locate)
{
    paint(locate);
    ...
}

VirtualBase::draw(8);
```



#### 继承接口和实现，但希望派生类覆写实现

simple virtual函数通常会提供一份实现代码，在派生类缺省时调用。虽然派生类可以对其覆写，但仍然可以使用其缺省版本。它告诉客户：你必须支持一个virtual函数，但如果你不想自己写， 你可以使用基类的缺省版本。

* simple virtual函数是让derived继承该函数的接口和缺省实现。

```c++
class VirtualBase {
public:
    virtual void draw(int locate);
}
//缺省代码
void Virtual::draw(int locate)
{
    paint(locate);
    ...
}
```

这样存在问题：如果客户新建类型继承自此基类，但忘记了覆写代码，其将自动调用缺省实现，且不会发生编译器错误（错误在编译器出现要好于在运行期出现）。

解决方法是：除非用户提出使用缺省实现，否则不提供。

* 提供一份缺省代码，置于protected中：

```c++
class VirtualBase {
public:
    virtual void draw(int locate);
protected:
    void doDraw(int locate)
    {
        paint(locate);
    }
}
//使用缺省实现
class DerivedA : public VirtualBase {
    virtual void draw(int locate)
    {
        doDraw(paint);
    }
}
//使用覆写实现
class DerivedB : public VirtualBase {
    virtual void draw(int locate)
    {
        doOther(locate);
    }
}
```



* 将原simple virtual函数改为pure virtual函数，提供一份该函数的实现。

```c++
class VirtualBase {
public:
    virtual void draw(int locate);
}
void VirtualBase::draw(int locate)
{
    paint(locate);
}

//使用缺省实现
class DerivedA : public VirtualBase {
    virtual void draw(int locate)
    {
        VirtualBase::draw(locate);
    }
}
//使用覆写实现
class DerivedB : public VirtualBase {
    virtual void draw(int locate)
    {
        doOther(locate);
    }
}
```



#### 继承接口和实现，且不允许覆写实现

* 声明non-virtual函数的目的是为了零derived class继承函数的接口及一份强制性实现。



总结：

* 接口继承和实现继承不同。在public继承之下，derived class总是继承base class的接口。
* pure virtual函数只指定接口继承。
* simple virtual函数具体指定接口继承且提供缺省实现。
* non-virtual函数具体指定接口继承以及强制性实现继承。



### 条款37：绝不重新定义继承而来的缺省参数值

当继承的函数是virtual或pure virtual，且提供了一份缺省参数时，重新定义缺省参数值将引发错误：

```c++
class A {
    virtual void draw(int val = 0);
}
class B : public A {
    virtual void draw(string val = "NONE");
}

A* pb = new B;     //创建一个A指向B的指针
B->draw();         //调用B的draw函数，没有提供参数。
```

在没有提供参数的情况下，B的draw函数提供了来自A的默认参数，即B->draw(int val = 0)。

解决办法：将virtual函数置于private，并提供一个non-virtual函数提供缺省参数。