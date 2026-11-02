# PickedTube GitHub — 采集前准备

准备开始时目录为空，过程中网站文件同步到本目录。GitHub 准备工具独立于现有网站，不修改现有页面或部署配置。
本阶段只准备 GitHub 栏目的离线工具；没有下载 HN 档案、调用模型或上线页面。
使用 Python 3.9+ 标准库，不需要安装依赖。

## 在应用终端输入密钥

```sh
cd hacker-tube
python3 scripts/setup_keys.py
python3 scripts/preflight.py
```

- Jev 使用 `TYPESAFE_API_KEY`。输入时不回显；不要把密钥发到聊天中。
- `GITHUB_TOKEN` 可先跳过；只读取公共仓库资料，不需要代码写入或私有仓库权限。
- HN 官方 API 不需要密钥。
- 直接回车保留原值或跳过；Ctrl+C 取消，不保存本次输入。
- 密钥存放于 `~/.config/pickedtube/keys.json`，项目目录之外，目录权限 700、文件权限 600。
  这是本地明文配置，不是加密保险库；不要分享此配置文件。
- preflight 只报告是否配置，不会验证密钥有效性或请求 API。

## 已准备

- `pipeline/github.py`：提取 GitHub 链接、归一化项目名、保留证据 URL。
- `pipeline/schema.sql`：HN 原文、仓库 ID、别名、提及、模型判断和抓取进度的 SQLite 表。
- `config/github.json`：暂定入选规则和未来小批次上限，采集与分类开关关闭。
- `config/questions.json`：Jev 对推荐态度、自荐身份、推荐理由的三个问题。
- `scripts/setup_keys.py`：交互式密钥输入与原子保存。
- `scripts/preflight.py`：配置和数据库结构的离线检查。

## 下一阶段实施顺序（尚未实现）

1. 对密钥进行不执行分类的连接检查，发现账户可用模型。
2. 实现有上限、可续跑的 HN 采集器；先做一批 GitHub 链接数据，不要求先复现视频。
3. 根据历史镜像实际月份统计决定回填范围；不能把未核实的镜像声明当成完整覆盖证明。
4. 通过 GitHub API 将别名归并到数字仓库 ID、缓存资料；低频条目先保留，避免别名被提前过滤。
5. 接入 Jev，先处理有限评论，保存输入摘要哈希、问题哈希、实际模型版本、原始概率与 token 用量。
   无密钥时保持待分类；不把规则猜测当成 AI 判断，不自动切换到未配置的付费服务。
6. 按不同用户和 UTC 月份统计，输出 GitHub 栏目 JSON，再接页面。
7. 日常更新除了新增 ID，还要处理旧评论修改、删除和仓库失效。

用户名相同仅作为身份线索；缺少证据时保留待核对。没有既有分类体系，暂不捏造“150 类”。
三人、三个月、一个理由以及概率阈值来自方案，均为待使用的初始配置。
数据库键提供去重基础；真实采集 upsert、缓存、分类适配器、资格计算、发布尚未实现。

## 本地检查

```sh
python3 -m unittest discover -s tests -v
python3 scripts/preflight.py
```

## 接入依据

2026-11-02 查阅 TypeSafe 官方 API、Choice、Noul 与分类 cookbook：
- https://docs.typesafe.ai/api/system-one
- https://docs.typesafe.ai/primitives/choice
- https://docs.typesafe.ai/primitives/noul
- https://docs.typesafe.ai/cookbooks/classifying_rag_passages

后续 Jev 使用 `POST https://api.typesafe.ai/v1/systemone` 和 Bearer 身份验证。
Choice 使用 `probabilities.recommend`，不能用分布的 `confidence` 替代推荐概率；
Noul 读取 `noul` 概率。模型列表由 `GET /v1/models` 获取。
