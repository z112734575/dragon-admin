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

```
pm2 start src/app.js --name dragon-admin 启动服务

pm2 stop dragon-admin 停止服务

pm2 restart dragon-admin 重启服务

pm2 delete dragon-admin 删除服务

pm2 list 查看服务列表

pm2 status dragon-admin 查看服务状态
```
