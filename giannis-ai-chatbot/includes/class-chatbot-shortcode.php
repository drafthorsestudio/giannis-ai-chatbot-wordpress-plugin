<?php
class Giannis_Chatbot_Shortcode {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        add_shortcode('giannis_chatbot', array($this, 'render_chatbot'));
    }
    
    public function render_chatbot($atts) {
        $atts = shortcode_atts(array(
            'height' => '600px',
            'width' => '100%'
        ), $atts);
        
        ob_start();
        include GIANNIS_CHATBOT_PLUGIN_DIR . 'templates/chatbot-template.php';
        return ob_get_clean();
    }
}