@echo off
chcp 65001 >nul
title SENDISTRI - Remise a zero de la base
echo ============================================================
echo   SENDISTRI - REMETTRE UNE BASE VIDE (remise a zero)
echo ============================================================
echo.
echo   /!\ ATTENTION : cette operation SUPPRIME TOUTES les donnees
echo   (abonnes, encaissements, documents...) et remet une base
echo   propre avec uniquement les comptes utilisateurs.
echo.
echo   A utiliser par exemple APRES une demonstration client,
echo   avant de commencer le vrai travail.
echo.
echo   IMPORTANT : FERMEZ d'abord le logiciel (fenetre du serveur)
echo   avant de continuer, sinon l'operation echouera.
echo.
set /p REP="Etes-vous SUR de vouloir tout effacer ? Tapez EFFACER pour confirmer : "
if /i not "%REP%"=="EFFACER" (
  echo.
  echo Operation annulee - rien n'a ete supprime.
  goto :fin
)

cd /d "%~dp0backend"
echo.
echo [1/3] Sauvegarde de securite de l'ancienne base...
if exist prisma\sendistri.db copy /y prisma\sendistri.db "prisma\sendistri-avant-remise-a-zero.db" >nul
echo [2/3] Suppression de la base...
if exist prisma\sendistri.db del /f prisma\sendistri.db
echo [3/3] Creation d'une base propre (comptes seulement)...
call npm run db:setup
echo.
echo ============================================================
echo   TERMINE ! Base vide prete. (Une copie de l'ancienne base
echo   a ete gardee : backend\prisma\sendistri-avant-remise-a-zero.db)
echo ============================================================
:fin
echo.
pause
