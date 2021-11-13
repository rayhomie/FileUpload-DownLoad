const router = require("koa-router")();
const path = require("path");
const fs = require("fs-extra");
const multer = require("@koa/multer");

// 存储上传文件的目录
const UPLOAD_DIR = path.join(__dirname, "../public/temp");

const multerUpload = multer();

router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Hello Koa 2!",
  });
});

router.post(
  "/upload",
  //使用@koa/multer解析文件
  multerUpload.fields([
    {
      name: "chunk", // 与FormData表单项的fieldName想对应
    },
  ]),
  async (ctx, next) => {
    try {
      console.log(ctx.request.files);
      sss;
      //上传时清空暂存目录
      fs.emptyDir(UPLOAD_DIR);
      ctx.body = {
        code: 0,
        msg: "文件上传成功",
      };
    } catch (error) {
      ctx.body = {
        code: 1,
        msg: "文件上传失败",
      };
    }
  }
);

router.get("/merge", async (ctx, next) => {
  ctx.body = "文件上传成功";
});

module.exports = router;
