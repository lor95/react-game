sudo docker build -t express-server .
sudo docker save express-server:latest > express-server.tar
sudo microk8s ctr image import express-server.tar