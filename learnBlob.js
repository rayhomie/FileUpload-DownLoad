//创建Blob实例对象，将数据以二进制的形式来储存
const blob = new Blob(
  [JSON.stringify({ name: "leihao" }), JSON.stringify({ age: 20 })],
  { type: "application/json" }
);
console.log(blob);
//读取Blob数据
const reader = new FileReader();
reader.addEventListener("loadend", function (e) {
  // reader.result 包含被转化为类型数组 typed array 的 blob
  console.log(e.target.result);
});
reader.readAsText(blob);

//转换成Base64字符串
const reader2 = new FileReader();
reader2.addEventListener("loadend", function (e) {
  // reader.result 包含被转化为类型数组 typed array 的 blob
  console.log(e.target.result);
});
reader2.readAsDataURL(blob);

//转化成url
const url = URL.createObjectURL(blob);
console.log(url);

new Response(blob).text().then((text) => console.log(text));
