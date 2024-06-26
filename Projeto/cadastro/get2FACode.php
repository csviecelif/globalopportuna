<?php
session_start();
require_once '../login/connection.php';
require_once '../vendor/autoload.php'; // Certifique-se de que o Autoload do Composer está correto

use OTPHP\TOTP;
use Endroid\QrCode\QrCode;
use Endroid\QrCode\Writer\PngWriter;

define('SESSION_EXPIRATION_TIME', 9000);

function isSessionExpired() {
    if (isset($_SESSION['login_time'])) {
        if (time() - $_SESSION['login_time'] > SESSION_EXPIRATION_TIME) {
            return true;
        }
    }
    return false;
}

$response = array();

if (isset($_SESSION['userId'])) {
    $userId = $_SESSION['userId'];

    $query = "SELECT twoef FROM usuarios WHERE userId = ?";
    if ($stmt = $con->prepare($query)) {
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $stmt->bind_result($secret);
        $stmt->fetch();
        $stmt->close();

        if ($secret) {
            $totp = TOTP::create($secret);
            $totp->setLabel('GlobalOpportuna');
            $totp->setIssuer('GlobalOpportuna');
            $otpAuthURL = $totp->getProvisioningUri();

            // Gerar QR code
            $qrCode = QrCode::create($otpAuthURL);
            $writer = new PngWriter();
            $result = $writer->write($qrCode);

            $response['qrCode'] = base64_encode($result->getString());
        } else {
            $response['error'] = 'Erro ao obter o código 2FA do banco de dados.';
        }
    } else {
        $response['error'] = 'Erro na preparação da consulta: ' . $con->error;
    }
} else {
    $response['error'] = 'Nenhuma sessão ativa.';
}

header('Content-Type: application/json');
echo json_encode($response);
?>
