<?php

/**
 * @author Brent Honeybone
 * Class Aligent_Messages_Model_Messages
 */
class Aligent_Messages_Model_Messages extends Mage_Core_Model_Abstract {

    const CONFIG_MESSAGES_COOKIE_ENABLED  = 'aligent_messages/settings/enable_cookie';
    const CONFIG_MESSAGES_COOKIE_NAME  = 'aligent_messages/settings/cookie_name';

    protected $bEnabled = false;
    protected $sCookieName = 'mage_msgs';

    protected $aEventHandlers = array(
        'aligent_messages/messageEventHandlers_cartAddSuccess',
        'aligent_messages/messageEventHandlers_wishlistAddSuccess'
    );

    protected $aSessionStores = array(
        'catalog/session',
        'catalogsearch/session',
        'checkout/session',
        'core/session',
        'customer/session',
        'review/session',
        'tag/session',
        'wishlist/session',
    );

    public function __construct()
    {
        parent::__construct();

        $this->bEnabled = (boolean) Mage::getStoreConfig(self::CONFIG_MESSAGES_COOKIE_ENABLED);
        $sCookieName = (string) Mage::getStoreConfig(self::CONFIG_MESSAGES_COOKIE_NAME);

        if ($sCookieName) {
            $this->sCookieName = $sCookieName;
        }
    }

    protected function getEvents($aMessages) {
        $aEvents = array();

        Mage::dispatchEvent(
            'messages_messages_before_get_events',
            array('instance' => $this, 'messages' => $aMessages, 'handlers' => $this->aEventHandlers)
        );

        foreach ($this->aEventHandlers as $sEventHandler) {
            $aEvents = array_merge(Mage::getSingleton($sEventHandler)->parse($aMessages), $aEvents);
        }

        $aEvents = array_unique($aEvents);

        Mage::dispatchEvent(
            'messages_messages_after_get_events',
            array('instance' => $this, 'messages' => $aMessages, 'handlers' => $this->aEventHandlers, 'events' => $aEvents)
        );

        return array_unique($aEvents);
    }

    public function messagesControllerFrontSendResponseBefore()
    {
        if (!$this->bEnabled) {
            return $this;
        }

        $aMessageStores = $this->getSessionMessageStores();

        $aMessages = array();

        $aMessageExtras = Mage::registry('jsMessages');

        foreach ($aMessageStores as $sClassAlias) {
            foreach (Mage::getSingleton($sClassAlias)->getMessages(true)->getItems() as $oMessage) {
                $oNewMessage = new stdClass();
                $oExtraDetails = isset($aMessageExtras[spl_object_hash($oMessage)]) ? $aMessageExtras[spl_object_hash($oMessage)] : new Varien_Object();
                $oNewMessage->type = $oMessage->getType();
                $oNewMessage->message = $oMessage->getCode();
                $oNewMessage->class = $oExtraDetails->getClass();
                $oNewMessage->method = $oExtraDetails->getMethod();
                $aMessages[] = $oNewMessage;
            }
        }

        $aEvents = $this->getEvents($aMessages);

        $aResponse = array(
            'messages'  => $aMessages,
            'events'    => $aEvents
        );

        if (count($aMessages) || count($aEvents)) {
            $sEncodedMessages = Mage::helper('core')->jsonEncode($aResponse);

            Mage::getModel('core/cookie')->set(
                $this->sCookieName,
                $sEncodedMessages,
                null,
                null,
                null,
                false,
                false
            );
        }

        Mage::unregister('jsMessages');
    }

    public function messagesControllerFrontSendResponseAfter()
    {
        if (!$this->bEnabled) {
            return;
        }
        $aMessageStores = $this->getSessionMessageStores();
        foreach ($aMessageStores as $sClassAlias) {
            if ($oSession = Mage::getSingleton($sClassAlias)) {
                $oSession->getMessages(true);
            }
        }
    }

    public function getSessionMessageStores()
    {
        return $this->aSessionStores;
    }

    public function addSessionMessageStore($sAlias) {
        $this->aSessionStores[] = $sAlias;
    }

    public function removeSessionMessageStore($sAlias) {
        $iIndex = array_search($sAlias , $this->aSessionStores);

        if($iIndex !== false){
            unset($this->aSessionStores[$iIndex]);
        }
    }

    public function addMessageDetails($oEvent)
    {
        $aMessageStores = $this->getSessionMessageStores();

        $aMessages = Mage::registry('jsMessages');
        if (!$aMessages) $aMessages = array();

        $aBacktrace = debug_backtrace();
        $sMessageCallerClass = isset($aBacktrace[6]) ? $aBacktrace[6]['class'] : '';
        $sMessageCallerMethod = isset($aBacktrace[6]) ? $aBacktrace[6]['function'] : '';

        foreach ($aMessageStores as $sClassAlias) {
            /* @var $oMessage Mage_Core_Model_Message_Abstract */
            $oMessage = Mage::getSingleton($sClassAlias)->getMessages(false)->getLastAddedMessage();

            if (!$oMessage || isset($aMessages[spl_object_hash($oMessage)])) continue;

            $oCallerDetails = new Varien_Object();
            $oCallerDetails->setClass($sMessageCallerClass);
            $oCallerDetails->setMethod($sMessageCallerMethod);
            $oCallerDetails->setType($oMessage->getType());

            $aMessages[spl_object_hash($oMessage)] = $oCallerDetails;
        }
        Mage::unregister('jsMessages');
        Mage::register('jsMessages', $aMessages);
    }

}

