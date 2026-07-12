@echo off
chcp 65001 >nul
title SENDISTRI - Restaurer la base precedente
echo ============================================================
echo   SENDISTRI - RESTAURER LA BASE PRECEDENTE
echo ============================================================
echo.
echo Cette operation remet la base telle qu'elle etait AVANT la
echo derniere remise a zero (BASE-VIDE.bat). A utiliser apres une
echo demonstration client pour retrouver vos vraies donnees.
echo.
echo IMPORTANT : FERMEZ d'abord le logiciel (fenetre du serveur).
echo.
cd /d "%~dp0backend"
if not exist "prisma\sendistri-avant-remise-a-zero.db" (
  echo Aucune sauvegarde trouvee ^(prisma\sendistri-avant-remise-a-zero.db^).
  echo Rien n'a ete modifie.
  goto :fin
)
set /p REP="Restaurer la base sauvegardee ? (O/N) : "
if /i not "%REP%"=="O" goto :fin

echo.
echo Restauration en cours...
copy /y "prisma\sendistri-avant-remise-a-zero.db" "prisma\sendistri.db" >nul
echo.
echo ============================================================
echo   TERMINE ! Vos donnees d'avant la demonstration sont de
echo   retour. Redemarrez le logiciel.
echo ============================================================
:fin
echo.
pause
