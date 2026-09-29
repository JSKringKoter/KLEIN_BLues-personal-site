---
title: C++数据结构与算法
tags:
  - c++
  - 数据结构
abbrlink: 18010
date: 2023-05-16 10:12:42
---

## 数据结构部分



### 线性表

线性表（linear list）又称为线性表，它的是元素的一个有序集合，形式为e0, e1, e2……en-1。ei是线性表的元素，i是索引，n是线性表的长度或大小。当n=0时，线性表为空。

对线性表至少需要执行以下操作：

* 创建一个线性表
* 撤销一个线性表
* 确定线性表是否为空
* 确定线性表的长度
* 按给定索引查找元素
* 按给定元素查找索引
* 按给定索引删除元素
* 按一个给定的索引插入一个元素
* 从左至右输出线性元素表

#### 抽象数据类型linear list

将线性表用跨语言的抽象概念表示为：

```
抽象数据类型linear list
{
实例：
  有限个元素的有序集合
操作：
empty()：若表空，返回false
size()：返回线性表的大小（元素个数）
get(index)：返回线性表中索引为index的元素
indexOf(x)：返回线性表中元素为x的索引
erase(index)：删除线性表中索引为index的元素
insert(index, x)：向index处插入x
output()：从左至右输出元素
}
```

使用c++语言描述抽象概念：

```c++
template<typename T>
class linearList {
public:
	virtual ~linearList() {}

	virtual bool empty() const = 0;
	//返回线性表是否为空
	virtual int size() const = 0;
	//返回线性表元素个数
	virtual T& get(int index) const = 0;
	//返回索引为index的元素
	virtual int indexOf(const T& theElement) const = 0;
	//返回第一个元素为theEnement的索引
	virtual void erase(int index) = 0;
	//删除index的元素，无法操作const对象
	virtual void insert(int index, const T& theElement) = 0;
	//在index处插入theElement，无法操作const对象
    virtual void output() = 0;
    //从左至右输出元素
};
```



<!--more-->

#### 线性表——数组描述

从抽象类型linear list中派生出arraylist：

头文件如下：arrayList.h:

```c++
template<typename T>
class arrayList : public linearList<T> {
public:
	arrayList(int initialCapacity = 10);
	arrayList(const arrayList<T>&);
	~arrayList() { delete element; }

	bool empty() const { return listSize == 0; }
	int size() const { return listSize; }
	T& get(int index) const;
	int indexOf(const T& theElement) const;
	void erase(int index);
	void insert(int index, const T& theElement);
	void output();

private:
	void checkIndex(int index) const {
		if (index < 0 || index >= listSize) {
			std::cout << "Index : " << index << " illegal!\n";
			abort();
		}
	}

	T* element;
	int arrayLenth;
	int listSize;
};

```

具体实现如下：arrayList.cpp

```c++
template<typename T>
void changeLenth(T*& t, int oldLenth, int newLenth)
{//改变数组长度
	if (newLenth < 0)
		abort();

	T* temp = new T[newLenth];
	int number = std::min(oldLenth, newLenth);   //确定拷贝的元素长度
	copy(t, t + number, temp);
	delete[] t;                                  //释放原数组内存
	t = temp;                                    //将原指针指向新数组
}

template<typename T>
arrayList<T>::arrayList(int initialCapacity)
{//构造函数，时间复杂度为O(initialCapacity)（当自定义类）或O(1)（当基本类型）
	if (initialCapacity < 1) {
		std::cout << "initialCapacity = " << initialCapacity << " Must be > 0 \n";
		abort();
	}

	arrayLenth = initialCapacity;
	element = new T[arrayLenth];
	listSize = 0;
}

template<typename T>
arrayList<T>::arrayList(const arrayList& theList)
{//复制构造函数
	arrayLenth = theList.arrayLenth;
	listSize = theList.listSize;
	element = new T[arrayLenth];
	copy(theList, theList + theList.listSize, element);
}

template<typename T>
T& arrayList<T>::get(int index) const
{//获取下标为index的元素，时间复杂度为O(1)
	checkIndex(index);
	return element[index];
}

template<typename T>
int arrayList<T>::indexOf(const T& theElement) const
{//获取元素为theElement的下标，时间复杂度为O(max{listSize, 1})，简单起见记作O(listSize)
	int index = static_cast<int> (find(element, element + listSize, theElement) - element);
	if (index == listSize)
		return -1;

	return index;
}

template<typename T>
void arrayList<T>::erase(int index)
{//将index删除，时间复杂度为O(listSize - index)
	checkIndex(index);

	//调用copy函数，将index后的元素向前复制一位
	copy(element + index + 1, element + listSize, element + index);
	//调用最后一位元素的析构函数
	element[--listSize].~T();
}

template<typename T>
void arrayList<T>::insert(int index, const T& theElement)
{//在index插入theElement
	if (index < 0 || index > listSize) {
		std::cout << "Index : " << index << " illegal!\n";
		abort();
	}

	if (listSize == arrayLenth) {
		changeLenth(element, arrayLenth, arrayLenth * 2);
		arrayLenth *= 2;
	}

	for (int i = listSize; i > index; i--) {
		element[i] = element[i - 1];
	}

	element[index] = theElement;
	listSize++;
}

template<typename T>
void arrayList<T>::output()
{//从左至右输出
	cout << "[ ";
	for (int i = 0; i < listSize; i++) {
		cout << element[i] << ", ";
	}
	cout << "]";
}
```



* 练习20：编写类arrayList的新版本，如果在删除之后，线性表大小降至arrayLenth / 4以下，就创建一个新的数组，长度为max{arrayLengh / 2, initialCapacity}。将原表内容复制到新标。

  新的实现如下：

```c++
template<typename T>
void arrayList<T>::erase(int index)
{//将index删除，时间复杂度为O(listSize - index)
	checkIndex(index);

	//调用copy函数，将index后的元素向前复制一位
	copy(element + index + 1, element + listSize, element + index);
	//调用最后一位元素的析构函数
	element[--listSize].~T();

	if (listSize < arrayLenth / 4) {
		T* temp = new T[std::max(arrayLenth, 10)];
		copy(element, element + listSize, temp);
		delete[] element;
		element = temp;
	}
}
```



##### 数组描述—迭代器

创建一个iterator类，并在arrayList类中包含以下方法：

arrayList.h

```c++
class iterator;
iterator begin() { return iterator(element); }
iterator end() { return iterator(element + listSize); }
```



下面是iterator类的代码，其中函数声明为内联：iterator.h：

```c++
template<typename T>
class iterator
{
private:
	T* position;

public:
	iterator(T* thePosition = 0) { position = thePosition; }

	T& operator*() const { return *position; }
	T* operator->() const { return &*position; }

	//自增运算符
	iterator& operator++()
	{
		++position;
		return *this;
	}

	iterator& operator++(int)
	{
		iterator old = *this;
		++position;
		return old;
	}

	//自减运算符
	iterator& operator--()
	{
		--position;
		return *this;
	}

	iterator& operator--(int)
	{
		iterator old = *this;
		--position;
		return old;
	}


	bool operator!=(const iterator rhs) const
	{
		return position != rhs.position;
	}

	bool operator==(const iterator rhs) const
	{
		return position == rhs.position;
	}


};
```



#### 线性表——单向链表描述

链表的每个元素都在一个单独的节点中描述，每一个节点都有一个链域，它的值是链表下一个元素的地址。上一个节点连接着下一个节点，最后一位没有节点可以连接，故其值为nullptr。变量firstNode用来指向链表第一个节点。为了找到e2的位置，必须从firstNode开始，从其中的链域找到e1节点的指针，再从e1节点的链域找到e2节点的指针。

* **一般来说，为了找到索引为theIndex的元素，需要从firstNode开始，跟踪theIndex个指针才能找到。**



![链式线性表结构](assets/images/notes/legacy/linear-list-chain.png)

在上图中的链式描述中，每个节点只有一个链，这种结构被称作单向链表。链表从左到右，每个节点都链接着下一个节点，最后一个节点的链域值为nullptr，这样的结构也称作链条。

要从链表中删除元素（例如e2），需要找到第二个节点（即e1），再将第二个节点和第四个节点连接起来。为了插入未来索引为index的节点，需要先找到索引为index - 1的节点，在其后面插入新节点。在index == 0 和index > 0时需要讨论。

要实现链表，我们定义一个结构chainNode作为链表的节点，一个chian类用来储存链表头节点和大小。在chainNode中，element即为数据成员，next为链，即指向下一元素的指针。

定义文件：chain.h

```c++
//单个节点结构
template<typename T>
struct chainNode {

	T element;
	chainNode* next;

	chainNode() {}
	chainNode(const T& element)
	{
		this->element = element;
	}
	chainNode(const T& element, chainNode<T>* next)
	{
		this->element = element;
		this->next = next;
	}
};


//链表类
template<typename T>
class Chain : public linearList<T> {
private:

	chainNode<T>* firstNode;
	int listSize;

	void checkIndex(int theIndex) const
	{
		if (theIndex < 0 || theIndex >= listSize)
			abort();
	}

public:
	Chain(int initialCapatial = 10);
	Chain(const Chain<T>&);
	~Chain();

	bool empty() const { return listSize == 0; }
	int size() const { return listSize; }
	T& get(int theIndex) const;
	int indexOf(const T& theElement) const;
	void erase(int theIndex);
	void insert(int theIndex, const T& theElement);
	void push_front(const T& theElement);
	void output() const;

};
```



实现文件：chain.cpp

```c++
template<typename T>
Chain<T>::Chain(int initialCapatial)
{//构造函数
	if (initialCapatial < 1) {
		std::cout << "Initial capatial : " << initialCapatial << " can not be < 0" << std::endl;
		abort();
	}

	firstNode = nullptr;
	listSize = 0;
}

template<typename T>
Chain<T>::Chain(const Chain<T>& theList)
{//复制构造函数
	//先设置listSize，之后就不用管他了
	listSize = theList.listSize;
	//如果资源链表为空，将firstNode置空，直接返回
	if (theList.firstNode == nullptr) {
		firstNode = nullptr;
		return;
	}

	//创建一个头节点指向资源链表头，避免对资源链表直接操作
	chainNode<T>* souceNode = theList.firstNode;
	//复制链表的首元素
	firstNode = new chainNode<T>(souceNode->element);

	//资源链表指向下一个元素
	souceNode = souceNode->next;
	//创建一个头节点指向目标链表头，避免对目标链表直接操作
	chainNode<T>* targeNode = firstNode;

	//一直复制，知道souceNode为空
	while (souceNode != nullptr) {
		targeNode->next = new chainNode<T>(souceNode->element);
		targeNode = targeNode->next;
		souceNode = souceNode->next;
	}

}



template<typename T>
Chain<T>::~Chain()
{//析构函数
	while (firstNode != nullptr) {
		//新建一个指针指向next，在firstNode删除后，将firstNode移动到下一个节点
		chainNode<T>* nextNode = firstNode->next;
		delete firstNode;
		firstNode = nextNode;
	}
}



template<typename T>
void Chain<T>::push_front(const T& theElement)
{//在链表前插入数据
	chainNode<T>* newNode = new chainNode<T>(theElement);
	newNode->next = firstNode;
	firstNode = newNode;

	listSize++;
}


template<typename T>
void Chain<T>::output() const
{//输出链表
	chainNode<T>* node = firstNode;

	std::cout << "[ ";
	while (node != nullptr) {
		std::cout << node->element << ", ";
		node = node->next;
	}
	std::cout << " ]\n";
}




template<typename T>
T& Chain<T>::get(int theIndex) const
{//获取索引为theIndex的元素
	checkIndex(theIndex);

	chainNode<T>* currentNode = firstNode;
	for (int i = 0; i < theIndex; i++) {
		currentNode = currentNode->next;
	}
	return currentNode->element;
}




template<typename T>
int Chain<T>::indexOf(const T& theElement) const
{//获取元素为theElement的索引
	chainNode<T>* currentNode = firstNode;
	
	int theIndex = 0;
	while (currentNode != nullptr) {
		if (currentNode->element == theElement) {
			return theIndex;
		}

		currentNode = currentNode->next;
		theIndex++;
	}

	return -1;

}


template<typename T>
void Chain<T>::erase(int theIndex)
{//删除索引为theIndex的元素
	checkIndex(theIndex);

	chainNode<T>* deleteNode;
	if (theIndex == 0) {
	//如果目标为0，则删除第一个节点
		deleteNode = firstNode;
		firstNode = firstNode->next;
	}
	else {
	//用currentNode指向目标节点的前驱节点
		chainNode<T>* currentNode = firstNode;
		for (int i = 0; i < theIndex - 1; i++)
			currentNode = currentNode->next;

	//需要删除的节点即为前驱节点的后一个节点
		deleteNode = currentNode->next;
	//将前驱节点和后驱节点相连
		currentNode->next = currentNode->next->next;

	}
	delete deleteNode;
	listSize--;
}


template<typename T>
void Chain<T>::insert(int theIndex, const T& theElement)
{//在theIndex处插入元素
	if (theIndex < 0 || theIndex > listSize) { //无效索引
		std::cout << "Illagel index : " << theIndex << std::endl;
		abort();
	}

	if (theIndex == 0) {
		firstNode = new chainNode<T>(theElement, firstNode);
	}
	else {

		chainNode<T>* currentNode = firstNode;
		for (int i = 0; i < theIndex - 1; i++)
			currentNode = currentNode->next;

		currentNode->next = new chainNode<T>(theElement, currentNode->next);
	}

	listSize++;
}
```



##### linearLIst的扩充

在链表的一些运用中，除了抽象数据类型linearList，还需要诸如clear和push_back等操作。我们重新声明一个extendedLinearList类，其含有一个指向尾节点的指针lastNode。更新后的extendedLinearList的clear、push_back方法如下：

```c++
template<typename T>
void extendedLinearList<T>::clear()
{
    while (firstNode != nullptr) {
        chainNode<T>* nextNode = firstNode->next;
        delete firstNode;
        firstNode = nextNode;
    }
    listSize = 0;
}

template<typename T>
void extendedLinearList<T>::push_back(const T& theElement)
{
    chainNode<T>* newNode = new chainNode<T>(theElement, nullptr);
    if (listSize == 0) {
        firstNode = newNode;
        lastNode = newNode;
    }
    else {
        lastNode->next = newNode;
        lastNode = newNode;
    }
    listSize++;
}
```



##### 一些书后习题

* 编写chain<T>::setSize(theSize)，使得线性表大小等于theSize。若初始表大小小于theSize，不增加元素；若大于theSize，删除多余的元素。

```c++
template<typename T>
void Chain<T>::setSize(int theSize)
{
	if (listSize <= theSize)
		return;
	else {
		
		for (int i = 0; i < listSize - theSize; i++) {
			chainNode<T>* nextNode = firstNode->next;
			delete firstNode;
			firstNode = nextNode;
		}

		listSize = theSize;
	}
}
```

* 编写方法Chain<T>::set(theIndex, theElement)，它用元素theElement代替索引为theIndex的元素。若theIndex超出范围，则抛出异常。

```c++
template<typename T>
void Chain<T>::set(int theIndex, const T& theElement)
{
	checkIndex(theIndex);

	if (theIndex == 0)
		firstNode->element = theElement;
	else {
		chainNode<T>* frontNode = firstNode;
		for (int i = 0; i < theIndex - 1; i++)
			frontNode = frontNode->next;

		frontNode->next->element = theElement;
	}
}
```

* 编写方法Chian<T>::lastIndexOf(theElement)，它返回最后出现theElement的索引。若没有theElement，返回-1。

```c++
template<typename T>
int Chain<T>::lastIndexOf(const T& theElement) const
{
	chainNode<T>* currentNode = firstNode;
	int theIndex = 0;
	for (int step = 0; currentNode != nullptr; step++) {

		if (currentNode->element == theElement)
			theIndex = step;

		currentNode = currentNode->next;
	}

	if (theIndex == 0)
		return -1;
	else
		return theIndex;
}
```

* 重载运算符[]，使得表达式x[i]返回链表x的第i个元素的引用。若没有该元素，则抛出异常。

```c++
template<typename T>
T& Chain<T>::operator[] (int theIndex)
{
	checkIndex(theIndex);
	chainNode<T>* targeNode = firstNode;
	for (int i = 0; i < theIndex; i++)
		targeNode = targeNode->next;

	return targeNode->element;
}
```

* 重载运算符==，使得表达式x==y为true，当且仅当两个链表完全相等时成立。

```c++
template<typename T>
bool Chain<T>::operator==(const Chain<T>& rhs) const
{
	if (rhs.listSize != listSize)
		return false;

	for (chainNode<T>* leftCurrent = firstNode,
		*rightCurrent = rhs.firstNode;
		leftCurrent != nullptr && rightCurrent != nullptr;
		rightCurrent = rightCurrent->next,
		leftCurrent = leftCurrent->next)
	{
		if (rightCurrent->element != leftCurrent->element)
			return false;
	}

	return true;
}
```

* 编写方法Chian<T>::swap(theChain)，它交换元素*this和theChain。

```c++
template<typename T>
void Chain<T>::swap(Chain<T>& rhs)
{
	chainNode<T>* temp = firstNode;
	firstNode = rhs.firstNode;
	rhs.firstNode = temp;
}
```



#### 线性表——循环链表描述

单向链表将头节点和尾节点相连，就成为了一个循环链表。有两种循环链表的实现方式，一是声明一个头节点（headerNode），在链表为空时，它指向其自身。二是声明一个firstNode一个lastNode，lastNode指向firstNode。以下是第二种（不含头节点的循环链表）情况的基本实现：

定义文件：CircularLIst.h：

```c++
//单个节点结构
template<typename T>
struct chainNode {

	T element;
	chainNode* next;

	chainNode() {}
	chainNode(const T& element)
	{
		this->element = element;
	}
	chainNode(const T& element, chainNode<T>* next)
	{
		this->element = element;
		this->next = next;
	}
};

template<typename T>
class CircularList : public linearList<T> {
private:
	chainNode<T>* firstNode;
	chainNode<T>* lastNode;
	int listSize;

	void checkIndex(int theIndex) const
	{
		if (theIndex < 0 || theIndex >= listSize)
			abort();
	}
public:
	CircularList(int initialCapatial = 10);
	~CircularList();
	CircularList(const CircularList<T>& theList);

	bool empty() const { return listSize == 0; }
	int size() const { return listSize; }
	T& get(int theIndex) const;
	int indexOf(const T& theElement) const;
	void erase(int theIndex);
	void insert(int theIndex, const T& theElement);
	void output() const;
	void push_back(const T& theElement);
};
```



实现文件：CircularList.cpp：

```c++
template<typename T>
CircularList<T>::CircularList(int initailCapatial)
{//构造函数
	firstNode = new chainNode<T>();
	firstNode->next = firstNode;
	lastNode = firstNode;
	listSize = 0;
}

template<typename T>
CircularList<T>::~CircularList()
{//析构函数
	while (firstNode->next != lastNode) {
		chainNode<T>* nextNode = firstNode->next;
		delete firstNode;
		firstNode = nextNode;
	}
	delete lastNode;
}


template<typename T>
CircularList<T>::CircularList(const CircularList& theList)
{//复制构造函数
	listSize = theList.listSize;
	firstNode = new chainNode<T>(theList.firstNode->element);
	chainNode<T>* souceNode = theList.firstNode->next;
	chainNode<T>* targetNode = firstNode;

	do {
		targetNode->next = new chainNode<T>(souceNode->element);
		lastNode = targetNode->next;
		targetNode = targetNode->next;
		souceNode = souceNode->next;
	} while (souceNode != theList.firstNode);

	lastNode->next = firstNode;
}

template<typename T>
void CircularList<T>::output() const
{//输出
	std::cout << "[ ";
	chainNode<T>* currentNode = firstNode;
	do {
		std::cout << currentNode->element << ", ";
		currentNode = currentNode->next;
	} while (currentNode != firstNode);
	std::cout << " ]" << std::endl;
}

template<typename T>
void CircularList<T>::push_back(const T& theElement)
{//从尾节点插入
	if (listSize == 0) {
		lastNode->element = theElement;
	}
	else {
		lastNode->next = new chainNode<T>(theElement, firstNode);
		lastNode = lastNode->next;
	}
	listSize++;
}


template<typename T>
T& CircularList<T>::get(int theIndex) const
{//获取theIndex的元素
	checkIndex(theIndex);

	chainNode<T>* currentNode = firstNode;
	for (int i = 0; i < theIndex; i++)
		currentNode = currentNode->next;

	return currentNode->element;
}

template<typename T>
int CircularList<T>::indexOf(const T& theElement) const
{//获取theElement的索引
	chainNode<T>* currentNode = firstNode;
	int index = 0;
	do {
		if (currentNode->element == theElement)
			return index;
		currentNode = currentNode->next;
		index++;
	} while (currentNode != firstNode);

	return -1;
}


template<typename T>
void CircularList<T>::erase(int theIndex)
{//删除索引为theIndex的元素
	checkIndex(theIndex);

	chainNode<T>* deleteNode;
	if (theIndex == 0) {
		deleteNode = firstNode;
		firstNode = firstNode->next;
		lastNode->next = firstNode;
	}
	else {
		chainNode<T>* frontNode = firstNode;
		for (int i = 0; i < theIndex - 1; i++)
			frontNode = frontNode->next;
		deleteNode = frontNode->next;
		frontNode->next = frontNode->next->next;
	}
	delete deleteNode;
}


template<typename T>
void CircularList<T>::insert(int theIndex, const T& theElement)
{//在theIndex插入theElement元素
	if (theIndex < 0 || theIndex >= listSize) {
		std::cout << "Illagel index !" << std::endl;
		abort();
	}

	if (theIndex == 0) {
		lastNode->next = new chainNode<T>(theElement, firstNode);
		firstNode = lastNode->next;
	}
	else {
		chainNode<T>* frontNode = firstNode;
		for (int i = 0; i < theIndex - 1; i++)
			frontNode = frontNode->next;
		frontNode->next = new chainNode<T>(theElement, frontNode->next);
	}
	listSize++;
}
```



#### 链表的应用

##### 箱子排序

箱子排序将相同的节点放在同一个链表（称为bin箱子）中，再将箱子中的节点连接起来即排序完成。如果一个输入链表有5个节点，每个节点的范围为0~9，则需要10个箱子，每个箱子代表一个数据。开始时所有箱子都是空的。

箱子排序需要做的是：逐个删除输入链表的节点，将删除的节点分配到相应的箱子中；将每一个箱子的链表收集并连接起来，使其成为一个有序链表。如果使用的链表类是之前创建的Chain类，需要做的则是：连续删除链表的首元素，将其插入相应的箱子的链表首位；从最后一个箱子开始，逐个删除每个箱子的元素，将其插入原来的链表。

代码如下，它的时间复杂度是O(n+range)。

```c++
void binSort(Chain<int>& theChain, int range)
{
	Chain<int>* bin;
	bin = new Chain<int>[range + 1];

	int numberOfElement = theChain.size();
	for (int i = 0; i < numberOfElement; i++) {
		int element = theChain[0];
		theChain.erase(0);
		bin[element].push_front(element);
	}

	for (int j = range; j >= 0; j--) {
		while (!bin[j].empty()) {
			int element = bin[j][0];
			bin[j].erase(0);
			theChain.push_front(element);
		}
	}

	delete[] bin;
}
```



### 数组和矩阵

在实际应用中，数据经常以表的形式出现。由于数组描述会占用更多程序所需时间和空间，经常使用自定义的描述方式。矩阵经常用二维数组来描述。然而，矩阵的索引通常从1开始，c++的二维数组则是从0开始。矩阵的加法，乘法和转置，c++都不支持。我们开发了类matrix，它和矩阵的关系更加密切。



#### 数组的行主映射和列主映射

假设一个二维数组：```int x[3][6]```，将它映射到一维数组```int x[18]```时，从第一行开始，一次对每一行的索引从左至右编号，得到的映射结果为：

```
0  1  2  3  4  5
6  7  8  9  10 11
12 13 14 15 16 17
//行主映射
```

列主映射中，对索引的编号从最左列开始，依次对每一列从上到下编号。

```
0 3 6 9 12 15
1 4 7 10 13 16
2 5 8 11 14 17
//列主映射
```

在行主映射中，映射函数为：map(i1, i2) = i1 * u2 + i2 ，其中u2是数组的列数。



#### 二维数组的数组描述和行列主描述

* 数组描述：

对于一个三行五列的二维数组，数组描述创建一个长度为3的一维数组x，x的每个元素都是一个长度为5的一位数组。c++对元素的定位方式是使用一维数组映射函数找到指针x[i]，此为第i行第0个元素的地址，再对这个指针使用一维映射函数。

* 行列主描述

对于一个三行五列的二维数组，行主描述创建一个长度为15的一维数组，使用行主映射函数将一维映射到二维。它只需要一块连续的，能够容纳15个整数的空间。这样，储存空间从72降到了60。

为了访问索引为i1，i2的元素，需要使用二维映射函数计算出一个u（在一维的索引），再访问x[u]。



#### 不规则二维数组

不规则二维数组是每行/列元素数量不等的数组。二维数组是否为规则的取决于每一行的元素个数是否相同，元素的访问方式都是相同的。

```c++
int main 
{
    int numberOfRows = 5;
    int length[5] = { 6, 3, 4, 3, 7 };
    
    int **array = new int* [numberOfRows];
    for (int i = 0; i < numberOfRows; i++)
        array[i] = new int[length[i]];
}
```
