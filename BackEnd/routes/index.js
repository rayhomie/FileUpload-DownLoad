const router = require("koa-router")();
const path = require("path");
const fs = require("fs");
const multer = require("@koa/multer");

// 存储上传文件的目录
const UPLOAD_DIR = path.join(__dirname, "../public/temp");

const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    // 设置文件的存储目录
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    // 设置文件名
    cb(null, `${file.originalname}`);
  },
});

const multerUpload = multer({ storage });

router.get("/", async (ctx, next) => {
  await ctx.render("index", {
    title: "Hello Koa 2!",
  });
});

router.post(
  "/upload",
  async (ctx, next) => {
    try {
      await next();
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
  },
  multerUpload.fields([
    {
      name: "chunk", // 与FormData表单项的fieldName想对应
    },
  ])
);

router.get("/merge", async (ctx, next) => {
  ctx.body = "文件上传成功";
});

module.exports = router;
