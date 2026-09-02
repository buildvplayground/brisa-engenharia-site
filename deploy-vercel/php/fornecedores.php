<?php
/**
 * Brisa Engenharia — recebimento do cadastro de fornecedores / trabalhe conosco.
 * Grava em banco MySQL quando configurado e envia aviso por e-mail.
 * Configuração fica em db-config.php (fora do git). Veja db-config.example.php.
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function out(bool $ok, string $error = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    out(false, 'Método não permitido.', 405);
}

$cfgFile = __DIR__ . '/db-config.php';
$cfg = is_file($cfgFile) ? require $cfgFile : [];

/* ---------------------------------------------------------------- entradas */
function field(string $k, int $max): string {
    $v = trim((string)($_POST[$k] ?? ''));
    $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v) ?? '';
    return mb_substr($v, 0, $max);
}

$tipo     = field('tipo', 20);
$nome     = field('nome', 120);
$empresa  = field('empresa', 120);
$email    = field('email', 140);
$telefone = field('telefone', 32);
$atuacao  = field('atuacao', 140);
$mensagem = field('mensagem', 2000);
$consent  = ($_POST['consent'] ?? '') === '1';

if (!in_array($tipo, ['fornecedor', 'candidatura'], true)) $tipo = 'fornecedor';

if ($nome === '' || $email === '' || $telefone === '' || $atuacao === '') {
    out(false, 'Preencha nome, e-mail, telefone e área de atuação.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    out(false, 'E-mail inválido.', 422);
}
if (!$consent) {
    out(false, 'É necessário autorizar o tratamento dos dados.', 422);
}
/* honeypot simples: campo que humano não preenche */
if (trim((string)($_POST['website'] ?? '')) !== '') {
    out(true);
}

$ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
$ua = mb_substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255);

/* ------------------------------------------------------------------ banco */
$saved = false;
if (!empty($cfg['host']) && !empty($cfg['name'])) {
    try {
        $pdo = new PDO(
            "mysql:host={$cfg['host']};dbname={$cfg['name']};charset=utf8mb4",
            $cfg['user'] ?? '',
            $cfg['pass'] ?? '',
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_EMULATE_PREPARES => false]
        );
        $pdo->exec("CREATE TABLE IF NOT EXISTS fornecedores (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            tipo VARCHAR(20) NOT NULL,
            nome VARCHAR(120) NOT NULL,
            empresa VARCHAR(120) NULL,
            email VARCHAR(140) NOT NULL,
            telefone VARCHAR(32) NOT NULL,
            atuacao VARCHAR(140) NOT NULL,
            mensagem TEXT NULL,
            ip VARCHAR(45) NULL,
            user_agent VARCHAR(255) NULL,
            consent TINYINT(1) NOT NULL DEFAULT 1,
            criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_criado (criado_em)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $st = $pdo->prepare("INSERT INTO fornecedores
            (tipo,nome,empresa,email,telefone,atuacao,mensagem,ip,user_agent,consent)
            VALUES (?,?,?,?,?,?,?,?,?,1)");
        $st->execute([$tipo, $nome, $empresa ?: null, $email, $telefone, $atuacao,
                      $mensagem ?: null, $ip ?: null, $ua ?: null]);
        $saved = true;
    } catch (Throwable $e) {
        error_log('[brisa/fornecedores] ' . $e->getMessage());
    }
}

/* ------------------------------------------------------------------ e-mail */
$to = $cfg['mail_to'] ?? 'contato@brisa.eng.br';
$rotulo = $tipo === 'candidatura' ? 'Candidatura' : 'Fornecedor';
$assunto = "[Site] {$rotulo}: {$nome}";

$corpo = "Novo cadastro pelo site\n\n"
       . "Tipo: {$rotulo}\n"
       . "Nome: {$nome}\n"
       . "Empresa: " . ($empresa !== '' ? $empresa : 'não informada') . "\n"
       . "E-mail: {$email}\n"
       . "Telefone: {$telefone}\n"
       . "Área de atuação: {$atuacao}\n"
       . "Mensagem:\n" . ($mensagem !== '' ? $mensagem : '(sem mensagem)') . "\n\n"
       . "IP: {$ip}\n"
       . "Data: " . date('d/m/Y H:i') . "\n"
       . "Gravado no banco: " . ($saved ? 'sim' : 'não') . "\n";

$headers = "From: Site Brisa Engenharia <" . ($cfg['mail_from'] ?? 'no-reply@brisa.eng.br') . ">\r\n"
         . "Reply-To: {$nome} <{$email}>\r\n"
         . "Content-Type: text/plain; charset=utf-8\r\n"
         . "MIME-Version: 1.0\r\n";

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($assunto) . '?=', $corpo, $headers);

if (!$saved && !$sent) {
    out(false, 'Não conseguimos registrar seu cadastro agora. Escreva para contato@brisa.eng.br.', 500);
}
out(true);
