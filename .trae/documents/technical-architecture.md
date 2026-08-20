## 1. 架构设计

```mermaid
flowchart TD
    subgraph Frontend["前端层"]
        A["React + TypeScript"]
        B["Tailwind CSS 3"]
        C["React Router DOM"]
        D["Zustand 状态管理"]
        E["Lucide React 图标"]
    end
    
    subgraph Backend["后端层"]
        F["Express.js + TypeScript"]
        G["RESTful API"]
        H["Web Socket（实时通信）"]
    end
    
    subgraph Data["数据层"]
        I["SQLite 数据库"]
        J["Mock 数据"]
        K["文件存储（音频/图片）"]
    end
    
    subgraph External["外部服务"]
        L["Web Speech API"]
        M["Google Translate API"]
    end
    
    Frontend --> Backend
    Backend --> Data
    Frontend --> External
```

## 2. 技术栈说明

- **前端**: React@18 + TypeScript + Tailwind CSS@3 + Vite
- **路由**: React Router DOM@6
- **状态管理**: Zustand
- **图标库**: Lucide React
- **后端**: Express.js@4 + TypeScript
- **数据库**: SQLite（开发/演示）
- **构建工具**: Vite
- **包管理**: pnpm

## 3. 路由定义

| 路由 | 用途 | 组件 |
|------|------|------|
| / | 首页 | Home |
| /courses | 课程中心 | Courses |
| /courses/:id | 课程详情 | CourseDetail |
| /learn/:type | 学习模块 | Learn（单词/语法/口语/听力） |
| /profile | 个人中心 | Profile |
| /community | 社区 | Community |
| /community/:id | 帖子详情 | PostDetail |
| /login | 登录页面 | Login |
| /register | 注册页面 | Register |

## 4. API 定义

### 4.1 用户相关

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| POST | /api/auth/register | 用户注册 | `{ email, password, nickname }` | `{ user, token }` |
| POST | /api/auth/login | 用户登录 | `{ email, password }` | `{ user, token }` |
| GET | /api/users/me | 获取当前用户 | - | `{ user }` |
| PUT | /api/users/me | 更新用户信息 | `{ nickname, avatar, learningPrefs }` | `{ user }` |

### 4.2 课程相关

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| GET | /api/courses | 获取课程列表 | `{ language, level }` | `{ courses }` |
| GET | /api/courses/:id | 获取课程详情 | - | `{ course }` |
| GET | /api/courses/:id/chapters | 获取课程章节 | - | `{ chapters }` |

### 4.3 学习相关

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| GET | /api/learning/words | 获取单词列表 | `{ language, level }` | `{ words }` |
| POST | /api/learning/words | 提交单词学习记录 | `{ wordId, correct }` | `{ progress }` |
| GET | /api/learning/grammar | 获取语法题目 | `{ language, level }` | `{ questions }` |
| POST | /api/learning/grammar | 提交语法答案 | `{ questionId, answer }` | `{ result }` |
| POST | /api/learning/speaking | 提交口语练习 | `{ audio, transcript }` | `{ score }` |
| GET | /api/learning/listening | 获取听力材料 | `{ language, level }` | `{ material }` |

### 4.4 进度追踪

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| GET | /api/progress | 获取学习进度 | - | `{ progress }` |
| POST | /api/progress | 更新学习进度 | `{ courseId, chapterId, completed }` | `{ progress }` |
| GET | /api/progress/statistics | 获取学习统计 | - | `{ stats }` |

### 4.5 成就系统

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| GET | /api/achievements | 获取成就列表 | - | `{ achievements }` |
| GET | /api/achievements/user | 获取用户成就 | - | `{ userAchievements }` |
| POST | /api/achievements/unlock | 解锁成就 | `{ achievementId }` | `{ achievement }` |

### 4.6 社区相关

| 方法 | 路径 | 描述 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| GET | /api/community/posts | 获取帖子列表 | `{ page, category }` | `{ posts }` |
| POST | /api/community/posts | 创建帖子 | `{ title, content, category }` | `{ post }` |
| GET | /api/community/posts/:id | 获取帖子详情 | - | `{ post }` |
| POST | /api/community/posts/:id/comments | 添加评论 | `{ content }` | `{ comment }` |
| POST | /api/community/posts/:id/likes | 点赞帖子 | - | `{ likes }` |
| POST | /api/community/checkin | 每日打卡 | `{ content }` | `{ checkin }` |

## 5. 服务器架构图

```mermaid
flowchart TD
    A["Controller层"] --> B["Service层"]
    B --> C["Repository层"]
    C --> D["数据库"]
    
    subgraph Controller层
        A1["AuthController"]
        A2["CourseController"]
        A3["LearningController"]
        A4["ProgressController"]
        A5["AchievementController"]
        A6["CommunityController"]
    end
    
    subgraph Service层
        B1["AuthService"]
        B2["CourseService"]
        B3["LearningService"]
        B4["ProgressService"]
        B5["AchievementService"]
        B6["CommunityService"]
    end
    
    subgraph Repository层
        C1["UserRepository"]
        C2["CourseRepository"]
        C3["WordRepository"]
        C4["ProgressRepository"]
        C5["AchievementRepository"]
        C6["PostRepository"]
    end
    
    subgraph Database["SQLite"]
        D1["users表"]
        D2["courses表"]
        D3["words表"]
        D4["progress表"]
        D5["achievements表"]
        D6["posts表"]
    end
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    users ||--o{ progress : "has"
    users ||--o{ achievements_users : "earns"
    users ||--o{ posts : "creates"
    users ||--o{ comments : "writes"
    
    courses ||--o{ chapters : "contains"
    courses ||--o{ progress : "tracks"
    
    words ||--o{ progress : "learns"
    
    achievements ||--o{ achievements_users : "awards"
    
    posts ||--o{ comments : "has"
    posts ||--o{ likes : "receives"
    
    users {
        integer id PK
        string email UK
        string password
        string nickname
        string avatar
        string level
        integer experience
        string learning_prefs
        datetime created_at
        datetime updated_at
    }
    
    courses {
        integer id PK
        string title
        string description
        string language
        string level
        string cover_image
        integer duration
        integer rating
        datetime created_at
    }
    
    chapters {
        integer id PK
        integer course_id FK
        string title
        integer order
        string content_type
        string content
        datetime created_at
    }
    
    words {
        integer id PK
        string language
        string word
        string meaning
        string pronunciation
        string example
        string level
        datetime created_at
    }
    
    progress {
        integer id PK
        integer user_id FK
        integer course_id FK
        integer word_id FK
        integer chapter_id FK
        string type
        integer correct_count
        integer total_count
        datetime last_studied
        datetime created_at
    }
    
    achievements {
        integer id PK
        string title
        string description
        string icon
        integer required_points
        string condition
        datetime created_at
    }
    
    achievements_users {
        integer id PK
        integer user_id FK
        integer achievement_id FK
        datetime unlocked_at
    }
    
    posts {
        integer id PK
        integer user_id FK
        string title
        string content
        string category
        integer likes
        datetime created_at
    }
    
    comments {
        integer id PK
        integer post_id FK
        integer user_id FK
        string content
        datetime created_at
    }
    
    likes {
        integer id PK
        integer post_id FK
        integer user_id FK
        datetime created_at
    }
```

### 6.2 数据定义语言

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT 'default.png',
    level TEXT DEFAULT 'beginner',
    experience INTEGER DEFAULT 0,
    learning_prefs TEXT DEFAULT '{"language":"english","dailyGoal":30}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    language TEXT NOT NULL,
    level TEXT NOT NULL,
    cover_image TEXT,
    duration INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE chapters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    `order` INTEGER DEFAULT 0,
    content_type TEXT NOT NULL,
    content TEXT,
    FOREIGN KEY (course_id) REFERENCES courses(id)
);

CREATE TABLE words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    language TEXT NOT NULL,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    pronunciation TEXT,
    example TEXT,
    level TEXT DEFAULT 'beginner',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER,
    word_id INTEGER,
    chapter_id INTEGER,
    type TEXT NOT NULL,
    correct_count INTEGER DEFAULT 0,
    total_count INTEGER DEFAULT 0,
    last_studied DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id),
    FOREIGN KEY (word_id) REFERENCES words(id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id)
);

CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    icon TEXT NOT NULL,
    required_points INTEGER DEFAULT 0,
    condition TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievements_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (achievement_id) REFERENCES achievements(id)
);

CREATE TABLE posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    likes INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```