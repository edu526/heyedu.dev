// test/fixtures/long-invoice.mjs — genera una factura UBL 2.1 estilo SUNAT con N items gravados.
// Cumple con la estructura típica de un CPE peruano (ext:UBLExtensions con firma, cbc:Note SON, etc.),
// para que editores XML→PDF de terceros lo reconozcan como boleta/factura SUNAT válida.
import { numeroALetras } from '../../src/format.js';

const SUNAT_NS = `xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ccts="urn:oasis:names:specification:ubl:schema:xsd:CoreComponentParameters-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
         xmlns:qdt="urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2"
         xmlns:sac="urn:sunat:names:specification:ubl:peru:schema:xsd:SunatAggregateComponents-1"
         xmlns:stat="urn:oasis:names:specification:ubl:schema:xsd:DocumentStatusCode-1.0"
         xmlns:udt="urn:un:unece:uncefact:data:draft:UnqualifiedDataTypesSchemaModule:2"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`;

const SUNAT_CAT = {
  cpeType:  'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo01',
  currency: 'ISO 4217 Alpha',
  doc:      'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo06',
  igvCat:   'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo07',
  price:    'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo16',
  addr:     'urn:pe:gob:sunat:cpe:see:gem:catalogos:catalogo13',
};

// Bloque de firma digital placeholder — los editores reales validan la presencia del bloque,
// no la cadena criptográfica. Para tests esto basta.
const SIGNATURE_PLACEHOLDER = `<ext:UBLExtension>
      <ext:ExtensionContent><ds:Signature Id="SignSUNAT">
        <ds:SignedInfo>
          <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
          <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
          <ds:Reference URI="">
            <ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms>
            <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
            <ds:DigestValue>PLACEHOLDER_DIGEST</ds:DigestValue>
          </ds:Reference>
        </ds:SignedInfo>
        <ds:SignatureValue>PLACEHOLDER_SIGNATURE</ds:SignatureValue>
        <ds:KeyInfo><ds:X509Data><ds:X509Certificate>PLACEHOLDER_CERT</ds:X509Certificate></ds:X509Data></ds:KeyInfo>
      </ds:Signature></ext:ExtensionContent>
    </ext:UBLExtension>`;

export function makeLongInvoice({ items = 60, totalPerItem = 50, serie = 'F001', nro = '999' } = {}) {
  const lines = [];
  let totalGravada = 0;
  let totalIgv = 0;

  for (let i = 1; i <= items; i++) {
    const subtotal = totalPerItem;
    totalGravada += subtotal;
    const igvLine = +(subtotal * 0.18).toFixed(2);
    totalIgv += igvLine;

    lines.push(`
    <cac:InvoiceLine>
      <cbc:ID>${i}</cbc:ID>
      <cbc:InvoicedQuantity unitCode="NIU" unitCodeListAgencyName="United Nations Economic Commission for Europe" unitCodeListID="UN/ECE rec 20">1.00</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:LineExtensionAmount>
      <cbc:FreeOfChargeIndicator>false</cbc:FreeOfChargeIndicator>
      <cac:PricingReference>
        <cac:AlternativeConditionPrice>
          <cbc:PriceAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:PriceAmount>
          <cbc:PriceTypeCode listAgencyName="PE:SUNAT" listName="Tipo de Precio" listURI="${SUNAT_CAT.price}">01</cbc:PriceTypeCode>
        </cac:AlternativeConditionPrice>
      </cac:PricingReference>
      <cac:AllowanceCharge>
        <cbc:ChargeIndicator>true</cbc:ChargeIndicator>
        <cbc:Amount currencyID="PEN">0.00</cbc:Amount>
      </cac:AllowanceCharge>
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="PEN">${igvLine.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
          <cbc:TaxableAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:TaxableAmount>
          <cbc:TaxAmount currencyID="PEN">${igvLine.toFixed(2)}</cbc:TaxAmount>
          <cac:TaxCategory>
            <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
            <cbc:Percent>18.00</cbc:Percent>
            <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="${SUNAT_CAT.igvCat}">10</cbc:TaxExemptionReasonCode>
            <cac:TaxScheme>
              <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">1000</cbc:ID>
              <cbc:Name>IGV</cbc:Name>
              <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
            </cac:TaxScheme>
          </cac:TaxCategory>
        </cac:TaxSubtotal>
      </cac:TaxTotal>
      <cac:Item>
        <cbc:Description><![CDATA[PRODUCTO #${String(i).padStart(2, '0')}]]></cbc:Description>
        <cac:SellersItemIdentification>
          <cbc:ID/>
        </cac:SellersItemIdentification>
      </cac:Item>
      <cac:Price>
        <cbc:PriceAmount currencyID="PEN">${subtotal.toFixed(2)}</cbc:PriceAmount>
      </cac:Price>
    </cac:InvoiceLine>`);
  }

  const igv = +totalIgv.toFixed(2);
  const total = +(totalGravada + igv).toFixed(2);
  const sonStr = numeroALetras(total, 'PEN');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         ${SUNAT_NS}>
  <ext:UBLExtensions>
    <ext:UBLExtension>
      <ext:ExtensionContent>
        <sac:AdditionalInformation/>
      </ext:ExtensionContent>
    </ext:UBLExtension>
    ${SIGNATURE_PLACEHOLDER}
  </ext:UBLExtensions>
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>2.0</cbc:CustomizationID>
  <cbc:ID>${serie}-${nro}</cbc:ID>
  <cbc:IssueDate>2026-09-06</cbc:IssueDate>
  <cbc:IssueTime>14:32:00</cbc:IssueTime>
  <cbc:InvoiceTypeCode listAgencyName="PE:SUNAT" listID="0101" listName="Tipo de Documento" listSchemeURI="${SUNAT_CAT.cpeType}" listURI="${SUNAT_CAT.cpeType}" name="Tipo de Operacion">01</cbc:InvoiceTypeCode>
  <cbc:Note languageLocaleID="1000"><![CDATA[SON: ${sonStr}]]></cbc:Note>
  <cbc:DocumentCurrencyCode listAgencyName="United Nations Economic Commission for Europe" listID="ISO 4217 Alpha" listName="Currency">PEN</cbc:DocumentCurrencyCode>
  <cac:Signature>
    <cbc:ID>${serie}-${nro}</cbc:ID>
    <cac:SignatoryParty>
      <cac:PartyName><cbc:Name>SUNAT</cbc:Name></cac:PartyName>
    </cac:SignatoryParty>
    <cac:DigitalSignatureAttachment>
      <cac:ExternalReference><cbc:URI>SignSUNAT</cbc:URI></cac:ExternalReference>
    </cac:DigitalSignatureAttachment>
  </cac:Signature>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6" schemeName="Documento de Identidad" schemeURI="${SUNAT_CAT.doc}">20603396201</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName><cbc:Name><![CDATA[BODEGA DE PRUEBA]]></cbc:Name></cac:PartyName>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[BODEGA DE PRUEBA S.A.C.]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos" listURI="${SUNAT_CAT.addr}">0</cbc:AddressTypeCode>
          <cbc:CitySubdivisionName>-</cbc:CitySubdivisionName>
          <cbc:CityName>LIMA</cbc:CityName>
          <cbc:CountrySubentity>LIMA</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>150128</cbc:CountrySubentityCode>
          <cbc:District>PUEBLO LIBRE</cbc:District>
          <cac:AddressLine><cbc:Line><![CDATA[AV. LA MARINA 1234, DPTO. 501]]></cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="6" schemeName="Documento de Identidad" schemeURI="${SUNAT_CAT.doc}">20123456789</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName><![CDATA[CLIENTE DE PRUEBA E.I.R.L.]]></cbc:RegistrationName>
        <cac:RegistrationAddress>
          <cbc:AddressTypeCode listAgencyName="PE:SUNAT" listName="Establecimientos anexos" listURI="${SUNAT_CAT.addr}">0</cbc:AddressTypeCode>
          <cbc:CitySubdivisionName>-</cbc:CitySubdivisionName>
          <cbc:CityName>LIMA</cbc:CityName>
          <cbc:CountrySubentity>LIMA</cbc:CountrySubentity>
          <cbc:CountrySubentityCode>150131</cbc:CountrySubentityCode>
          <cbc:District>SAN ISIDRO</cbc:District>
          <cac:AddressLine><cbc:Line><![CDATA[JR. LOS PINOS 567, URB. SANTA MARIA]]></cbc:Line></cac:AddressLine>
          <cac:Country><cbc:IdentificationCode>PE</cbc:IdentificationCode></cac:Country>
        </cac:RegistrationAddress>
      </cac:PartyLegalEntity>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="PEN">${igv.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="PEN">${totalGravada.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="PEN">${igv.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID schemeAgencyName="United Nations Economic Commission for Europe" schemeID="UN/ECE 5305" schemeName="Tax Category Identifier">S</cbc:ID>
        <cbc:Percent>18.00</cbc:Percent>
        <cbc:TaxExemptionReasonCode listAgencyName="PE:SUNAT" listName="Afectacion del IGV" listURI="${SUNAT_CAT.igvCat}">10</cbc:TaxExemptionReasonCode>
        <cac:TaxScheme>
          <cbc:ID schemeAgencyName="PE:SUNAT" schemeID="UN/ECE 5153" schemeName="Codigo de tributos">1000</cbc:ID>
          <cbc:Name>IGV</cbc:Name>
          <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="PEN">${totalGravada.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:AllowanceTotalAmount currencyID="PEN">0.00</cbc:AllowanceTotalAmount>
    <cbc:ChargeTotalAmount currencyID="PEN">0.00</cbc:ChargeTotalAmount>
    <cbc:PrepaidAmount currencyID="PEN">0.00</cbc:PrepaidAmount>
    <cbc:PayableAmount currencyID="PEN">${total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>${lines.join('')}
</Invoice>`;
}

export const LONG_INVOICE_XML = makeLongInvoice({ items: 60, totalPerItem: 50 });
