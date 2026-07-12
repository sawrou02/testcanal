@echo off
chcp 65001 >nul
title SENDISTRI - Base de demonstration
echo ============================================================
echo   SENDISTRI - REMPLIR LA BASE DE DEMONSTRATION
echo ============================================================
echo.
echo Cette operation remplit le logiciel avec des donnees fictives
echo (abonnes, encaissements sur 6 mois, objectifs) pour presenter
echo le logiciel a un client.
echo.
echo Les donnees existantes sont CONSERVEES (rien n'est supprime).
echo.
echo CONSEIL : si votre base contient deja vos VRAIES donnees,
echo lancez d'abord BASE-VIDE.bat (il garde une copie de secours),
echo faites la demonstration, puis RESTAURER-BASE.bat pour revenir.
echo.
echo IMPORTANT : FERMEZ d'abord le logiciel (fenetre du serveur).
echo.
set /p REP="Continuer ? (O/N) : "
if /i not "%REP%"=="O" goto :fin

cd /d "%~dp0backend"
if not defined DATABASE_URL set "DATABASE_URL=file:./sendistri.db"
echo.
echo [1/2] Mise a jour de la base...
call npx prisma db push
echo.
echo [2/2] Chargement des donnees de demonstration...
call npm run seed:demo:full
echo.
echo ============================================================
echo   TERMINE ! Demarrez le logiciel normalement.
echo   Compte de demonstration : admin@sendistri.sn / Demo123!
echo ============================================================
:fin
echo.
pause
