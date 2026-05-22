const {
    Client,
    GatewayIntentBits,
    SlashCommandBuilder,
    Routes,
    REST,
    EmbedBuilder
} = require('discord.js');

const Database = require('better-sqlite3');

const express = require('express');
const app = express();

// ================= WEB SERVER (RENDER FREE) =================

app.get('/', (req, res) => {
    res.send('Bot online');
});

app.listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web server lancé.');
});

// ================= CONFIG =================

const config = {
    token: process.env.TOKEN,

    clientId: "1507287568440627261",
    guildId: "1478420890051018765",

    allowedRoles: [
        "Président",
        "Vice-président",
        "Sergent d'armes",
        "Trésorier",
        "Secrétaire"
    ],

    logChannelName: "📦・│stockage"
};

// ================= BOT =================

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= DATABASE =================

const db = new Database('stocks.db');

db.prepare(`
    CREATE TABLE IF NOT EXISTS stocks (
        item TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL
    )
`).run();

console.log("✅ Base SQLite V3 connectée.");

// ================= COMMANDES =================

const commands = [

    // AJOUTER

    new SlashCommandBuilder()
        .setName('ajouter')
        .setDescription('Ajouter du stock')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription('Quantité')
                .setRequired(true)),

    // RETIRER

    new SlashCommandBuilder()
        .setName('retirer')
        .setDescription('Retirer du stock')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription('Quantité')
                .setRequired(true)),

    // STOCK

    new SlashCommandBuilder()
        .setName('stock')
        .setDescription('Voir le stock'),

    // SUPPRIMER ITEM

    new SlashCommandBuilder()
        .setName('supprimeritem')
        .setDescription('Supprimer un item')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true)),

    // SET STOCK

    new SlashCommandBuilder()
        .setName('setstock')
        .setDescription('Définir une quantité')
        .addStringOption(option =>
            option.setName('objet')
                .setDescription('Nom de l’objet')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('quantite')
                .setDescription('Nouvelle quantité')
                .setRequired(true))

].map(command => command.toJSON());

// ================= ENREGISTREMENT COMMANDES =================

const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {

    try {

        await rest.put(
            Routes.applicationGuildCommands(
                config.clientId,
                config.guildId
            ),
            { body: commands }
        );

        console.log('✅ Commandes enregistrées.');

    } catch (error) {

        console.error(error);

    }

})();

// ================= READY =================

client.once('ready', () => {

    console.log(`✅ ${client.user.tag} est en ligne.`);

});

// ================= PERMISSIONS =================

function hasPermission(interaction) {

    return interaction.member.roles.cache.some(
        role => config.allowedRoles.includes(role.name)
    );

}

// ================= LOGS =================

function sendLog(interaction, message) {

    const logsChannel = interaction.guild.channels.cache.find(
        c => c.name === config.logChannelName
    );

    if (logsChannel) {
        logsChannel.send(message);
    }

}

// ================= INTERACTIONS =================

client.on('interactionCreate', async interaction => {

    if (!interaction.isChatInputCommand()) return;

    // ================= AJOUTER =================

    if (interaction.commandName === 'ajouter') {

        if (!hasPermission(interaction)) {

            return interaction.reply({
                content: '❌ Permission refusée.',
                ephemeral: true
            });

        }

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        const item = db.prepare(
            'SELECT * FROM stocks WHERE item = ?'
        ).get(objet);

        if (item) {

            db.prepare(
                'UPDATE stocks SET quantity = ? WHERE item = ?'
            ).run(item.quantity + quantite, objet);

        } else {

            db.prepare(
                'INSERT INTO stocks(item, quantity) VALUES(?, ?)'
            ).run(objet, quantite);

        }

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock ajouté')
            .setDescription(`✅ ${quantite} ${objet} ajouté(s).`)
            .setColor('Green');

        await interaction.reply({
            embeds: [embed]
        });

        sendLog(
            interaction,
            `📥 ${interaction.user.username} a ajouté ${quantite} ${objet}`
        );
    }

    // ================= RETIRER =================

    if (interaction.commandName === 'retirer') {

        if (!hasPermission(interaction)) {

            return interaction.reply({
                content: '❌ Permission refusée.',
                ephemeral: true
            });

        }

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        const item = db.prepare(
            'SELECT * FROM stocks WHERE item = ?'
        ).get(objet);

        if (!item) {

            return interaction.reply({
                content: '❌ Item introuvable.',
                ephemeral: true
            });

        }

        let newQuantity = item.quantity - quantite;

        if (newQuantity < 0) {
            newQuantity = 0;
        }

        db.prepare(
            'UPDATE stocks SET quantity = ? WHERE item = ?'
        ).run(newQuantity, objet);

        const embed = new EmbedBuilder()
            .setTitle('📦 Stock retiré')
            .setDescription(`❌ ${quantite} ${objet} retiré(s).`)
            .setColor('Red');

        await interaction.reply({
            embeds: [embed]
        });

        sendLog(
            interaction,
            `📤 ${interaction.user.username} a retiré ${quantite} ${objet}`
        );
    }

    // ================= STOCK =================

    if (interaction.commandName === 'stock') {

        const rows = db.prepare(
            'SELECT * FROM stocks ORDER BY item ASC'
        ).all();

        if (rows.length === 0) {

            return interaction.reply({
                content: '📦 Aucun stock enregistré.'
            });

        }

        let description = '';

        rows.forEach(row => {

            description += `📦 **${row.item}** : ${row.quantity}\n`;

        });

        const embed = new EmbedBuilder()
            .setTitle('📦 Inventaire Hells Legion')
            .setDescription(description)
            .setColor('Blue')
            .setFooter({
                text: 'Inventory V3 • SQLite'
            });

        await interaction.reply({
            embeds: [embed]
        });
    }

    // ================= SUPPRIMER ITEM =================

    if (interaction.commandName === 'supprimeritem') {

        if (!hasPermission(interaction)) {

            return interaction.reply({
                content: '❌ Permission refusée.',
                ephemeral: true
            });

        }

        const objet = interaction.options.getString('objet');

        const result = db.prepare(
            'DELETE FROM stocks WHERE item = ?'
        ).run(objet);

        if (result.changes === 0) {

            return interaction.reply({
                content: '❌ Item introuvable.',
                ephemeral: true
            });

        }

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Item supprimé')
            .setDescription(`❌ ${objet} supprimé du stock.`)
            .setColor('DarkRed');

        await interaction.reply({
            embeds: [embed]
        });

        sendLog(
            interaction,
            `🗑️ ${interaction.user.username} a supprimé ${objet}`
        );
    }

    // ================= SET STOCK =================

    if (interaction.commandName === 'setstock') {

        if (!hasPermission(interaction)) {

            return interaction.reply({
                content: '❌ Permission refusée.',
                ephemeral: true
            });

        }

        const objet = interaction.options.getString('objet');
        const quantite = interaction.options.getInteger('quantite');

        const item = db.prepare(
            'SELECT * FROM stocks WHERE item = ?'
        ).get(objet);

        if (item) {

            db.prepare(
                'UPDATE stocks SET quantity = ? WHERE item = ?'
            ).run(quantite, objet);

        } else {

            db.prepare(
                'INSERT INTO stocks(item, quantity) VALUES(?, ?)'
            ).run(objet, quantite);

        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Stock modifié')
            .setDescription(`📦 ${objet} = ${quantite}`)
            .setColor('Orange');

        await interaction.reply({
            embeds: [embed]
        });

        sendLog(
            interaction,
            `⚙️ ${interaction.user.username} a défini ${objet} à ${quantite}`
        );
    }

});

// ================= LOGIN =================

client.login(config.token);