# 文件上传下载全解

参考资料：

[文件上传，搞懂这 8 种场景就够了](https://juejin.cn/post/6980142557066067982)

[文件下载，搞懂这 9 种场景就够了](https://juejin.cn/post/6989413354628448264)

## 上传

在实际上面中可以使用[filepond](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fpqina%2Ffilepond)库来实现。

### 1】单文件上传

file 类型的 input 元素，通过 dom 直接拿去选择后的文件。

```jsx
<input id="uploadFile" type="file" accept="image/*" />
<button id="submit" onclick="uploadFile()">上传文件</button>

const uploadFileEle = document.querySelector("#uploadFile");

const request = axios.create({
  baseURL: "http://localhost:3000/upload",
  timeout: 60000,
});

async function uploadFile() {
  if (!uploadFileEle.files.length) return;
  const file = uploadFileEle.files[0]; // 获取单个文件
  // 省略文件的校验过程，比如文件类型、大小校验
  upload({
    url: "/single",
    file,
  });
}

function upload({ url, file, fieldName = "file" }) {
  let formData = new FormData();
  formData.set(fieldName, file);
  //通过axios发请求
  request.post(url, formData, {
    // 监听上传进度
    onUploadProgress: function (progressEvent) {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(percentCompleted);
     },
  });
}
```

### 2】多文件上传

file 类型的 input 元素的**multiple**属性

```html
<input id="uploadFile" type="file" accept="image/*" multiple />
<button id="submit" onclick="uploadFile()">上传文件</button>
```

在单文件上传的代码中，我们通过 uploadFileEle.files[0] 获取单个文件，而对于多文件上传来说，我们需要获取已选择的文件列表，即通过 uploadFileEle.files 来获取，它返回的是一个 FileList 对象。

```jsx
async function uploadFile() {
  if (!uploadFileEle.files.length) return;
  const files = Array.from(uploadFileEle.files);
  upload({
    url: "/multiple",
    files,
  });
}
```

因为要支持上传多个文件，所以我们需要同步更新一下 upload 函数。对应的处理逻辑就是遍历文件列表，然后使用 FormData 对象的 append 方法来添加多个文件，具体代码如下所示：

```js
function upload({ url, files, fieldName = "file" }) {
  let formData = new FormData();
  files.forEach((file) => {
    formData.append(fieldName, file);
  });
  request.post(url, formData, {
    // 监听上传进度
    onUploadProgress: function (progressEvent) {
      const percentCompleted = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      console.log(percentCompleted);
    },
  });
}
```

### 3】目录上传

`input` 元素上还有一个的 `webkitdirectory` 属性。当设置了 `webkitdirectory` 属性之后，我们就可以选择目录了。

```html
<input id="uploadFile" type="file" accept="image/*" webkitdirectory />
```

点击上传按钮之后，我们就可以获取文件列表。列表中的文件对象上含有一个 `webkitRelativePath` 属性，用于表示当前文件的相对路径。

```js
FileList[
  {
    name:'image-1.png'
    //...
    webkitRelativePath:'img/image-1.png'
  },
  {
    name:'image-2.png'
    //...
    webkitRelativePath:'img/image-2.png'
  },
  //...
]
```

前端请求代码：

```js
function upload({ url, files, fieldName = "file" }) {
  let formData = new FormData();
  files.forEach((file, i) => {
    formData.append(
      fieldName,
      files[i],
      files[i].webkitRelativePath;//用于存当前文件的相对路径
    );
  });
  request.post(url, formData); // 省略上传进度处理
}
```

### 4】压缩目录上传

实现文件压我们使用的是**[JSZip](https://github.com/Stuk/jszip)**这个库来实现。

JSZip 实例上的 `file(name, data [,options])` 方法，可以把文件添加到 ZIP 文件中。基于该方法我们可以封装了一个 `generateZipFile` 函数，用于把目录下的文件列表压缩成一个 ZIP 文件。以下是 `generateZipFile` 函数的具体实现：

```javascript
async function uploadFile() {
  let fileList = uploadFileEle.files;
  if (!fileList.length) return;
  let webkitRelativePath = fileList[0].webkitRelativePath;
  let zipFileName = webkitRelativePath.split("/")[0] + ".zip";
  let zipFile = await generateZipFile(zipFileName, fileList);
  upload({
    url: "/single",
    file: zipFile,
    fileName: zipFileName,
  });
}

function generateZipFile(
  zipName,
  files,
  options = { type: "blob", compression: "DEFLATE" }
) {
  return new Promise((resolve, reject) => {
    const zip = new JSZip();
    for (let i = 0; i < files.length; i++) {
      zip.file(files[i].webkitRelativePath, files[i]);
    }
    zip.generateAsync(options).then(function (blob) {
      zipName = zipName || Date.now() + ".zip";
      const zipFile = new File([blob], zipName, {
        type: "application/zip",
      });
      resolve(zipFile);
    });
  });
}
```

### 5】拖拽上传

要实现拖拽上传的功能，我们需要先了解与拖拽相关的事件。比如 `drag`、`dragend`、`dragenter`、`dragover` 或 `drop` 事件等。这里我们只介绍接下来要用到的拖拽事件：

- `dragenter`：当拖拽元素或选中的文本到一个可释放目标时触发；
- `dragover`：当元素或选中的文本被拖到一个可释放目标上时触发（每 100 毫秒触发一次）；
- `dragleave`：当拖拽元素或选中的文本离开一个可释放目标时触发；
- `drop`：当元素或选中的文本在可释放目标上被释放时触发。

那么如何获取拖拽对应的数据呢？这时我们需要使用 [DataTransfer](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fzh-CN%2Fdocs%2FWeb%2FAPI%2FDataTransfer) 对象，该对象用于保存拖动并放下过程中的数据。它可以保存一项或多项数据，这些数据项可以是一种或者多种数据类型。若拖动操作涉及拖动文件，则我们可以通过 [DataTransfer](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fzh-CN%2Fdocs%2FWeb%2FAPI%2FDataTransfer) 对象的 `files` 属性来获取文件列表。

```js
//绑定事件
dropAreaEle.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer; //通过dataTransfer获取拖拽数据
  const files = [...dt.files];
  files.forEach((file) => {
    previewImage(file, imgPreviewEle);
  });
  // 省略文件上传代码
}
```

### 6】粘贴上传

要实现剪贴板上传的功能，可以分为以下 3 个步骤：

- 监听容器的粘贴事件；
- 读取并解析剪贴板中的内容；
- 动态构建 `FormData` 对象并上传。

```js
onst IMAGE_MIME_REGEX = /^image\/(jpe?g|gif|png)$/i;
const uploadAreaEle = document.querySelector("#uploadArea");

uploadAreaEle.addEventListener("paste", async (e) => {
  e.preventDefault();
  const files = [];
  //Clipboard API
  if (navigator.clipboard) {
    let clipboardItems = await navigator.clipboard.read();
    for (const clipboardItem of clipboardItems) {
      for (const type of clipboardItem.types) {
        if (IMAGE_MIME_REGEX.test(type)) {
           const blob = await clipboardItem.getType(type);
           insertImage(blob, uploadAreaEle);
           files.push(blob);
         }
       }
     }
  } else {
    //若当前浏览器不支持异步 Clipboard API，则我们会尝试通过 e.clipboardData.items 来访问剪贴板中的内容。
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (IMAGE_MIME_REGEX.test(items[i].type)) {
          let file = items[i].getAsFile();
          //需要注意的是，在遍历剪贴板内容项的时候，我们是通过 getAsFile 方法来获取剪贴板的内容。
          insertImage(file, uploadAreaEle);
          files.push(file);
        }
      }
  }
  if (files.length > 0) {
    confirm("剪贴板检测到图片文件，是否执行上传操作？")
      && upload({
           url: "/multiple",
           files,
         });
   }
});

```

### 7】大文件分块上传

[JavaScript 中如何实现大文件并发上传？](https://mp.weixin.qq.com/s/-iSpCMaLruerHv7717P0Wg)

在上传大文件时，为了提高上传的效率，我们一般会使用 Blob.slice 方法对大文件按照指定的大小进行**切割**，然后通过**多线程**进行分块上传，等所有分块都成功上传后，再通知服务端进行**分块合并**。

#### [Blob](https://juejin.cn/post/6989413354628448264#heading-1)

Blob（Binary Large Object）表示二进制类型的大对象。（将数据以二进制的形式存储）

公式`Blob = type + [Blob,ArrayBuffer,DOMString]`

1、转成 blob 格式

```js
const blob = new Blob(
  [JSON.stringify({ name: "leihao" }), JSON.stringify({ age: 20 })],
  { type: "application/json" }
);
console.log(blob);
//Blob {size: 27, type: "application/json"}
```

2、FileReader 读取 blob 格式

```js
//读取Blob数据
const reader = new FileReader();
reader.addEventListener("loadend", function (e) {
  console.log(e.target.result);
  //{"name":"leihao"}{"age":20}
});
reader.readAsText(blob);
```

FileReader 的方法有：

- `FileReader.readAsArrayBuffer()`：读取成 ArrayBuffer 数据对象
- `FileReader.readAsBinaryString()`：读取成原始二进制数据
- `FileReader.readAsDataURL()`：读取成 url 格式的 Base64 字符串格式
- `FileReader.readAsText()`：读取成字符串

3、将 blob 格式转换

blob 转化成 BlobUrl

```js
const url = URL.createObjectURL(blob);
console.log(url);
// blob:null/43bfc043-ed47-4a1a-9545-e5b7bc480a14
```

blob 转换成 base64 字符串

```js
const reader2 = new FileReader();
reader2.addEventListener("loadend", function (e) {
  // reader.result 包含被转化为类型数组 typed array 的 blob
  console.log(e.target.result);
  // data:application/json;base64,eyJuYW1lIjoibGVpaGFvIn17ImFnZSI6MjB9
});
reader2.readAsDataURL(blob);
```

base64 转成 blob

```js
function dataUrlToBlob(base64, mimeType) {
  let bytes = window.atob(base64.split(",")[1]);
  let ab = new ArrayBuffer(bytes.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
```

5、Response 对象也可以处理 blob

```js
new Response(blob).text().then((text) => console.log(text));
// {"name":"leihao"}{"age":20}
```

#### FIle

通常情况下，File 对象是来自用户在一个 `<input>` 元素上选择文件后返回的 FileList 对象，也可以是来自由拖放操作生成的`DataTransfer`对象，或者来自 HTMLCanvasElement 上的`mozGetAsFile() API`。

**File 对象是特殊类型的 Blob**，且可以用在任意的 Blob 类型的上下文中。比如说`FileReader`、`URL.createObjectURL()`及`XMLHttpRequest.send()`都能处理 Blob 和 File。在大文件上传的场景中，我们将使用 Blob.slice 方法对大文件按照指定的大小进行切割，然后对分块进行并行上传。

**file 文件可以直接使用 slice 方法，英文 file 类型时特殊的 Blob 类型。**

```js
file.slice(start, end);
blob.slice(start.end);
```

#### Blob URL/Object URL

Blob URL/Object URL 是一种伪协议，允许 Blob 和 File 对象用作图像、下载二进制数据链接等的 URL 源。在浏览器中，我们使用 `URL.createObjectURL` 方法来创建 Blob URL，该方法接收一个 `Blob` 对象，并为其创建一个唯一的 URL，其形式为 `blob:<origin>/<uuid>`，对应的示例如下：

```javascript
blob:http://localhost:3000/53acc2b6-f47b-450f-a390-bf0665e04e59
```

浏览器内部为每个通过 `URL.createObjectURL` 生成的 URL 存储了一个 **URL → Blob 映射**。因此，此类 URL 较短，但可以访问 `Blob`。生成的 URL 仅在当前文档打开的状态下才有效。它允许引用 `<img>`、`<a>` 中的 `Blob`，但如果你访问的 Blob URL 不再存在，则会从浏览器中收到 404 错误。

上述的 Blob URL 看似很不错，但实际上它也有副作用。 **虽然存储了 URL → Blob 的映射，但 Blob 本身仍驻留在内存中，浏览器无法释放它。映射在文档卸载时自动清除，因此 Blob 对象随后被释放**。但是，如果应用程序寿命很长，那么 Blob 在短时间内将无法被浏览器释放。因此，如果你创建一个 Blob URL，即使不再需要该 Blob，它也会存在内存中。

针对这个问题，你可以调用 `URL.revokeObjectURL(url) ` 方法，从内部映射中删除引用，从而允许删除 Blob（如果没有其他引用），并释放内存。

#### [代码仓库](https://github.com/rayhomie/bigFileUploadDemo)

```js
//前端代码
const uploadFileEle = document.querySelector("#uploadFile");
const MB = 1048576;
const chunkSize = 5 * MB; // 单位MB

async function upload() {
  const [file] = uploadFileEle.files;
  const fileInfo = await processFile(file);
  console.log(fileInfo);
  await fetchChunkUpload(fileInfo);
  await fetchMerge(fileInfo.hash, fileInfo.chunkList.length);
}

async function fetchChunkUpload({ hash, chunkList }) {
  return Promise.all(
    chunkList.map((item) => {
      const formdata = new FormData();
      formdata.append("chunk", item.chunk, item.hash);
      return fetch(`https://bigfileupdate.rayhomie.icu/upload/${hash}`, {
        method: "POST",
        body: formdata,
      });
    })
  );
}

async function fetchMerge(hash, count) {
  const res = await fetch(
    `https://bigfileupdate.rayhomie.icu/merge?file_hash=${hash}&count=${count}`
  ).then((res) => res.json());
  console.log(res);
}

//文件处理函数
async function processFile(file) {
  chunkCount = Math.ceil(file.size / chunkSize);
  const chunkList = sliceFile({ file, chunkCount, chunkSize });

  //通过promise来处理回调保证结果顺序
  const finalFile = (
    await Promise.all([
      //完整文件的hash
      { hash: await computeHash(file), file, type: "complete" },
      //分块文件的hash
      ...chunkList.map(async (chunk, chunkIndex) => ({
        hash: `${await computeHash(chunk)}_${chunkIndex}`,
        chunk,
        chunkIndex,
      })),
    ])
  ) //换一种数据结构来存储
    .reduce((acc, fileItem) => {
      if (fileItem.type === "complete") {
        acc = fileItem;
        acc.chunkList = [];
      } else {
        acc.chunkList.push(fileItem);
      }
      return acc;
    }, {});
  return finalFile;
}

//切片函数
function sliceFile({ file, chunkCount, chunkSize }) {
  return new Array(chunkCount)
    .fill()
    .map((_, index) => file.slice(index * chunkSize, (index + 1) * chunkSize));
}

//计算单个文件哈希
function computeHash(file) {
  //使用SparkMD5暴露的ArrayBuffer接口来获取哈希
  const spark = new SparkMD5.ArrayBuffer();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    //读取blob格式文件
    reader.readAsArrayBuffer(file);
    //读取blob成ArrayBuffer时的回调
    reader.onload = (e) => {
      //将ArrayBuffer添加给spark
      spark.append(e.target.result);
      //结束添加，并计算得到hash值
      resolve(spark.end());
    };
    reader.onerror = (e) => {
      reject(e);
      reader.abort();
    };
  });
}
```

## [下载](https://juejin.cn/post/6989413354628448264)

### 1】a 标签

#### Base64 转 Blob

```js
function dataUrlToBlob(base64, mimeType) {
  let bytes = window.atob(base64.split(",")[1]);
  let ab = new ArrayBuffer(bytes.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
```

通过手动创建 a 标签并模拟点击来实现自动下载

```js
// 保存文件
function saveFile(blob, filename) {
  const a = document.createElement("a");
  //download属性可以设置需要下载文件的名字
  a.download = filename;
  //这里是用BlobUrl可以缩短链接长度
  a.href = URL.createObjectURL(blob);
  //模拟点击
  a.click();
  //从内部映射中删除引用，从而允许删除 Blob（如果没有其他引用），并释放内存。
  URL.revokeObjectURL(a.href);
}
```

### 2】showSaveFilePicker API

[showSaveFilePicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowSaveFilePicker) API 是 [`Window`](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FWindow) 接口中定义的方法，调用该方法后会显示允许用户选择保存路径的文件选择器。该方法的签名如下所示：

```js
let FileSystemFileHandle = Window.showSaveFilePicker(options);
```

调用 [showSaveFilePicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowSaveFilePicker) 方法之后，会返回一个 [FileSystemFileHandle](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFileSystemFileHandle) 对象。有了该对象，你就可以调用该对象上的方法来操作文件。比如调用该对象上的 [createWritable](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFileSystemFileHandle%2FcreateWritable) 方法之后，就会返回 [FileSystemWritableFileStream](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFileSystemWritableFileStream) 对象，就可以把数据写入到文件中。具体的使用方式如下所示：

```javascript
async function saveFile(blob, filename) {
  try {
    //返回promise是一个文件处理对象
    const handle = await window.showSaveFilePicker({
      //默认文件名
      suggestedName: filename,
      //允许保存的文件类型列表
      types: [
        {
          description: "PNG file",
          accept: {
            "image/png": [".png"],
          },
        },
        {
          description: "Jpeg file",
          accept: {
            "image/jpeg": [".jpeg"],
          },
        },
      ],
    });
    //创建写入流
    const writable = await handle.createWritable();
    //使用写入流写入数据到文件
    await writable.write(blob);
    //关闭写入流
    await writable.close();
    //返回文件处理对象
    return handle;
  } catch (err) {
    console.error(err.name, err.message);
  }
}
```

其实 [showSaveFilePicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowSaveFilePicker) 是 [File System Access](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFile_System_Access_API) API 中定义的方法，除了 [showSaveFilePicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowSaveFilePicker) 之外，还有 [showOpenFilePicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowOpenFilePicker) 和 [showDirectoryPicker](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2Fwindow%2FshowDirectoryPicker) 等方法。如果你想在实际项目中使用这些 API 的话，可以考虑使用 **GoogleChromeLabs** 开源的 [browser-fs-access](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2FGoogleChromeLabs%2Fbrowser-fs-access) 这个库，该库可以让你在支持平台上更方便地使用 [File System Access](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fen-US%2Fdocs%2FWeb%2FAPI%2FFile_System_Access_API) API，对于不支持的平台会自动降级使用 `<input type="file">` 和 `<a download>` 的方式。

### 3】FileSaver 下载

在引入 [FileSaver.js](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Feligrey%2FFileSaver.js) 这个库之后，我们就可以使用它提供的 `saveAs` 方法来保存文件。该方法对应的签名如下所示：

```js
FileSaver saveAs(
 Blob/File/Url,
 optional DOMString filename,
 optional Object { autoBom }
)
```

saveAs 方法支持 3 个参数，第 1 个参数表示它支持 `Blob/File/Url` 三种类型，第 2 个参数表示文件名（可选），而第 3 个参数表示配置对象（可选）。如果你需要 [FlieSaver.js](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Feligrey%2FFileSaver.js) 自动提供 Unicode 文本编码提示（参考：[字节顺序标记](https://link.juejin.cn?target=https%3A%2F%2Fbaike.baidu.com%2Fitem%2FBOM%2F2790364)），则需要设置 `{ autoBom: true}`。

#### 1. 保存文本

```javascript
let blob = new Blob(["大家好，我是阿宝哥!"], {
  type: "text/plain;charset=utf-8",
});
saveAs(blob, "hello.txt");
```

#### 2. 保存线上资源

```javascript
saveAs("https://httpbin.org/image", "image.jpg");
```

#### 3. 保存 canvas 画布内容

```javascript
let canvas = document.getElementById("my-canvas");
canvas.toBlob(function (blob) {
  saveAs(blob, "abao.png");
});
//需要注意的是 canvas.toBlob() 方法并非在所有浏览器中都可用，对于这个问题，你可以考虑使用 canvas-toBlob.js 来解决兼容性问题。
```

### 4】zip 下载

利用[JSZip](https://github.com/Stuk/jszip)这个库来实现对文件压缩处理。该工具的[api 文档](https://stuk.github.io/jszip/documentation/api_jszip/external.html)。

下面还会使用到 JSZipUtils 工具库来获取文件内容。该[api 文档](http://stuk.github.io/jszip-utils/documentation/api/getbinarycontent.html)。

```js
const images = ["body.png", "eyes.png", "mouth.png"];
const imageUrls = images.map((name) => "../images/" + name);

async function download() {
  let zip = new JSZip();
  Promise.all(imageUrls.map(getFileContent)).then((contents) => {
    contents.forEach((content, i) => {
      //添加内容到zip包文件中
      zip.file(images[i], content);
    });
    //异步生成zip包并指定blob类型，最后调用 FileSaver.js 提供的SaveAs方法保存下来。
    zip.generateAsync({ type: "blob" }).then(function (blob) {
      saveAs(blob, "material.zip");
    });
  });
}

// 从指定的url上下载文件内容
function getFileContent(fileUrl) {
  return new JSZip.external.Promise(function (resolve, reject) {
    // 调用jszip-utils库提供的getBinaryContent方法获取文件内容
    JSZipUtils.getBinaryContent(fileUrl, function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
```

在以上代码中，当用户点击 **打包下载** 按钮时，就会调用 `download` 函数。在该函数内部，会先调用 `JSZip` 构造函数创建 `JSZip` 对象，然后使用 [Promise.all](https://link.juejin.cn?target=https%3A%2F%2Fdeveloper.mozilla.org%2Fzh-CN%2Fdocs%2FWeb%2FJavaScript%2FReference%2FGlobal_Objects%2FPromise%2Fall) 函数来确保所有的文件都下载完成后，再调用 `file(name, data [,options])` 方法，把已下载的文件添加到前面创建的 `JSZip` 对象中。最后通过 `zip.generateAsync` 函数来生成 Zip 文件并使用 [FileSaver.js](https://link.juejin.cn?target=https%3A%2F%2Fgithub.com%2Feligrey%2FFileSaver.js) 提供的 `saveAs` 方法保存 Zip 文件。

### 5】附件形式下载

在服务端下载的场景中，附件形式下载是一种比较常见的场景。在该场景下，我们通过设置 **Content-Disposition** 响应头来指示响应的内容以何种形式展示，是以内联（inline）的形式，还是以附件（attachment）的形式下载并保存到本地。

```
Content-Disposition: inline
Content-Disposition: attachment
Content-Disposition: attachment; filename="mouth.png"
```

而在 HTTP 表单的场景下， `Content-Disposition` 也可以作为 **multipart body** 中的消息头：

```
Content-Disposition: form-data
Content-Disposition: form-data; name="fieldName"
Content-Disposition: form-data; name="fieldName"; filename="filename.jpg"
```

下面是在 koa 中的示例代码：

```js
// 以附件形式下载
// http://localhost:9000/file?filename=headpic.jpeg
router.get("/file", async (ctx, next) => {
  const { filename } = ctx.query; //获取文件名
  const STATIC_PATH = path.join(__dirname, "./static/"); //静态资源目录
  const filePath = STATIC_PATH + filename;
  const fStats = fs.statSync(filePath); //获取文件信息
  ctx.set({
    "Content-Type": "application/octet-stream", //设置内容格式为：八位字节流
    "Content-Disposition": `attachment; filename=${filename}`,
    "Content-Length": fStats.size,
  });
  ctx.body = fs.createReadStream(filePath);
});
```

### 6】base64 格式下载

重要的就是利用这个函数来实现转换格式

```js
// base64转blob格式
function base64ToBlob(base64, mimeType) {
  let bytes = window.atob(base64);
  let ab = new ArrayBuffer(bytes.length);
  let ia = new Uint8Array(ab);
  for (let i = 0; i < bytes.length; i++) {
    ia[i] = bytes.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}
```

### 7】chunked 下载

分块传输编码主要应用于如下场景，即要传输大量的数据，但是在请求在没有被处理完之前响应的长度是无法获得的。例如，当需要用从数据库中查询获得的数据生成一个大的 HTML 表格的时候，或者需要传输大量的图片的时候。

要使用分块传输编码，则需要在响应头配置 `Transfer-Encoding` 字段，并设置它的值为 `chunked` 或 `gzip, chunked`：

```
Transfer-Encoding: chunked
Transfer-Encoding: gzip, chunked
```

响应头 `Transfer-Encoding` 字段的值为 `chunked`，表示数据以一系列分块的形式进行发送。**需要注意的是 `Transfer-Encoding` 和 `Content-Length` 这两个字段是互斥的**，也就是说响应报文中这两个字段不能同时出现。下面我们来看一下分块传输的编码规则：

- 每个分块包含分块长度和数据块两个部分；
- 分块长度使用 16 进制数字表示，以 `\r\n` 结尾；
- 数据块紧跟在分块长度后面，也使用 `\r\n` 结尾，但数据不包含 `\r\n`；
- 终止块是一个常规的分块，表示块的结束。不同之处在于其长度为 0，即 `0\r\n\r\n`。
