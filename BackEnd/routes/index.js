const router = require("koa-router")();
const path = require("path");
const fs = require("fs-extra");
const ofs = require("fs");

const multer = require("@koa/multer");

// 存储上传文件的目录
const UPLOAD_DIR = path.join(__dirname, "../public/temp");
fs.ensureDir(UPLOAD_DIR);
const multerUpload = multer();

router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Hello Koa 2!",
  });
});

router.post(
  "/upload/:dirname",
  //使用@koa/multer解析文件
  multerUpload.fields([
    {
      name: "chunk", // 与FormData表单项的fieldName想对应
    },
  ]),
  async (ctx, next) => {
    try {
      const files = ctx.request.files.chunk;
      console.log(files);
      //分块文件目录（即文件的完整文件的hash）
      const dir_path = path.join(UPLOAD_DIR, ctx.params.dirname);
      //确保文件夹
      await fs.ensureDir(dir_path);
      //写入分块文件
      files.forEach((file) =>
        fs.outputFile(path.join(dir_path, file.originalname), file.buffer)
      );
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
  try {
    const { file_hash, count } = ctx.query;
    const dir_path = path.join(UPLOAD_DIR, file_hash);
    const data = ofs.readdirSync(dir_path);
    if (data.length !== +count) {
      throw new Error(err.toString());
    }
    console.log("文件合并完成");
    ctx.body = {
      code: 0,
      msg: "文件合并完成",
    };
  } catch (err) {
    fs.emptyDirSync(dir_path);
    ctx.body = {
      code: 1,
      msg: "文件合并失败",
      reason: err,
    };
  }
});

module.exports = router;
