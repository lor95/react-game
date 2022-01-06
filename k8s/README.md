## Usage

Deploy `config` content in microk8s environment with `sudo microk8s.kubectl -n react-game apply -f .`.  

Useful commands:
* Create namespace: `sudo microk8s.kubectl create ns react-game`.
* Portforward express-server: `sudo microk8s.kubectl port-forward -n react-game service/express-server 4001:4001 --address $(ip route get 1 | sed -n 's/^.*src \([0-9.]*\) .*$/\1/p')`.
