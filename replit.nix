
{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.procps
    pkgs.nodePackages.prettier
    pkgs.lsof
    pkgs.postgresql
  ];
}
