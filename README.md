## 创建 database dragon_admin
```
CREATE DATABASE dragon_admin;
```

## 初始化数据库
```
npx prisma migrate dev --name init
```

## 修复多对多关系
```
npx prisma migrate dev --name fix_many_to_many
```

## 发送验证码
```
http://localhost:3000/auth/send-verification-code?email=test@example.com
```